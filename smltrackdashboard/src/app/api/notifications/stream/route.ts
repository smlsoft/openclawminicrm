import { getDB } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth — ใช้ cookie JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production",
  });
  const userName = token?.name as string || "";
  const userEmail = token?.email as string || "";

  if (!userName && !userEmail) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = await getDB();

  // สร้าง SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let running = true;
      let prevHash = "";

      const poll = async () => {
        if (!running) return;
        try {
          // 1. หา last seen ของ user นี้
          const lastSeen = await db.collection("user_last_seen").findOne({ userEmail });
          const globalLastSeen = lastSeen?.lastSeenAt || new Date(0);
          const sourceLastSeen: Record<string, Date> = lastSeen?.sourceLastSeen || {};

          // 2. หา customers ที่ assign ให้ user นี้
          const nameVariants = [userName, userName.replace("SML-", ""), `SML-${userName}`].filter(Boolean);
          const assignedCustomers = await db.collection("customers")
            .find({ assignedTo: { $in: nameVariants } }, { projection: { rooms: 1, name: 1 } })
            .toArray();

          // ถ้าไม่มี assignment → ดูทั้งหมด (admin/demo)
          const allRooms: string[] = assignedCustomers.length > 0
            ? assignedCustomers.flatMap(c => c.rooms || [])
            : (await db.collection("groups_meta").find({}, { projection: { sourceId: 1 } }).limit(100).toArray()).map(g => g.sourceId);

          if (allRooms.length === 0) {
            send("unread", { total: 0, conversations: [] });
            return;
          }

          // 3. นับข้อความใหม่ต่อ sourceId
          const unreadConvs: any[] = [];
          let total = 0;

          // Batch query — หา groups_meta ที่มี activity ใหม่
          const recentGroups = await db.collection("groups_meta")
            .find({
              sourceId: { $in: allRooms },
              lastMessageAt: { $gt: globalLastSeen },
            }, { projection: { sourceId: 1, groupName: 1, platform: 1, lastMessageAt: 1 } })
            .toArray();

          for (const g of recentGroups) {
            const since = sourceLastSeen[g.sourceId] || globalLastSeen;
            const count = await db.collection("messages").countDocuments({
              sourceId: g.sourceId,
              createdAt: { $gt: since },
              userName: { $not: { $regex: `^SML` } }, // ไม่นับข้อความ staff
            });

            if (count > 0) {
              // ดึงข้อความล่าสุด
              const lastMsg = await db.collection("messages")
                .findOne({ sourceId: g.sourceId }, { sort: { createdAt: -1 }, projection: { content: 1, userName: 1, createdAt: 1 } });

              unreadConvs.push({
                sourceId: g.sourceId,
                name: g.groupName || g.sourceId,
                platform: g.platform || "line",
                count,
                lastMessage: lastMsg?.content?.substring(0, 60) || "",
                lastUser: lastMsg?.userName || "",
                lastAt: lastMsg?.createdAt || null,
              });
              total += count;
            }
          }

          // เรียงตาม unread มากสุดก่อน
          unreadConvs.sort((a, b) => (b.lastAt?.getTime?.() || 0) - (a.lastAt?.getTime?.() || 0));

          // ดึง pending payments count
          const pendingPayments = await db.collection("payments").countDocuments({ status: "pending" });

          // ส่งเฉพาะเมื่อข้อมูลเปลี่ยน
          const hash = `${total}:${pendingPayments}:${unreadConvs.map(c => `${c.sourceId}:${c.count}`).join(",")}`;
          if (hash !== prevHash) {
            send("unread", { total, pendingPayments, conversations: unreadConvs.slice(0, 20) });
            prevHash = hash;
          }
        } catch (err) {
          console.error("[SSE] poll error:", err);
        }
      };

      // Poll ทุก 3 วินาที
      await poll();
      const interval = setInterval(poll, 3000);

      // Heartbeat ทุก 15 วินาที
      const heartbeat = setInterval(() => {
        if (!running) return;
        try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch {}
      }, 15000);

      // Cleanup เมื่อ client disconnect
      req.signal.addEventListener("abort", () => {
        running = false;
        clearInterval(interval);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Nginx/Caddy: don't buffer
    },
  });
}

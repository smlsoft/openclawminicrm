import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production",
  });
  const userName = token?.name as string || "";
  const userEmail = token?.email as string || "";
  if (!userEmail) return NextResponse.json({ total: 0, conversations: [] });

  const db = await getDB();

  const lastSeen = await db.collection("user_last_seen").findOne({ userEmail });
  const globalLastSeen = lastSeen?.lastSeenAt || new Date(0);

  // หา rooms ที่ assign ให้ user
  const nameVariants = [userName, userName.replace("SML-", ""), `SML-${userName}`].filter(Boolean);
  const customers = await db.collection("customers")
    .find({ assignedTo: { $in: nameVariants } }, { projection: { rooms: 1 } })
    .toArray();

  const allRooms = customers.length > 0
    ? customers.flatMap(c => c.rooms || [])
    : (await db.collection("groups_meta").find({}, { projection: { sourceId: 1 } }).limit(100).toArray()).map(g => g.sourceId);

  // นับ unread
  let total = 0;
  const pipeline = [
    { $match: { sourceId: { $in: allRooms }, createdAt: { $gt: globalLastSeen }, userName: { $not: { $regex: "^SML" } } } },
    { $group: { _id: "$sourceId", count: { $sum: 1 } } },
  ];
  const counts = await db.collection("messages").aggregate(pipeline).toArray();
  for (const c of counts) total += c.count;

  return NextResponse.json({ total, bySource: counts });
}

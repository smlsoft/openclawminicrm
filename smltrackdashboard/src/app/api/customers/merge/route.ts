import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * POST /api/customers/merge
 * รวมลูกค้า 2 คนเป็นคนเดียว
 * primaryId = ตัวหลัก (เก็บไว้), secondaryId = ตัวรอง (ลบหลัง merge)
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDB();
    const { primaryId, secondaryId } = await request.json();

    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ error: "invalid ids" }, { status: 400 });
    }

    const primary = await db.collection("customers").findOne({ _id: new ObjectId(primaryId) });
    const secondary = await db.collection("customers").findOne({ _id: new ObjectId(secondaryId) });

    if (!primary || !secondary) {
      return NextResponse.json({ error: "customer not found" }, { status: 404 });
    }

    // รวม rooms (ไม่ซ้ำ)
    const mergedRooms = [...new Set([...(primary.rooms || []), ...(secondary.rooms || [])])];

    // รวม tags (ไม่ซ้ำ)
    const mergedTags = [...new Set([...(primary.tags || []), ...(secondary.tags || [])])];
    const mergedCustomTags = [...new Set([...(primary.customTags || []), ...(secondary.customTags || [])])];

    // รวม platformIds — ใช้ค่าที่มีอยู่ ถ้า primary ไม่มีก็เอาจาก secondary
    const mergedPlatformIds = {
      line: primary.platformIds?.line || secondary.platformIds?.line || primary.lineId || secondary.lineId || "",
      facebook: primary.platformIds?.facebook || secondary.platformIds?.facebook || primary.facebookId || secondary.facebookId || "",
      instagram: primary.platformIds?.instagram || secondary.platformIds?.instagram || primary.instagramId || secondary.instagramId || "",
    };

    // รวม totalMessages
    const mergedMessages = (primary.totalMessages || 0) + (secondary.totalMessages || 0);

    // ใช้ข้อมูลจาก primary เป็นหลัก ถ้าไม่มีก็เอาจาก secondary
    const fillFrom = (field: string) => primary[field] || secondary[field] || "";

    await db.collection("customers").updateOne(
      { _id: new ObjectId(primaryId) },
      {
        $set: {
          rooms: mergedRooms,
          tags: mergedTags,
          customTags: mergedCustomTags,
          platformIds: mergedPlatformIds,
          lineId: mergedPlatformIds.line,
          facebookId: mergedPlatformIds.facebook,
          instagramId: mergedPlatformIds.instagram,
          totalMessages: mergedMessages,
          // เติมข้อมูลที่ primary ไม่มี
          firstName: fillFrom("firstName"),
          lastName: fillFrom("lastName"),
          company: fillFrom("company"),
          position: fillFrom("position"),
          phone: fillFrom("phone"),
          email: fillFrom("email"),
          address: fillFrom("address"),
          avatarUrl: fillFrom("avatarUrl"),
          notes: [primary.notes, secondary.notes].filter(Boolean).join("\n---\n") || "",
          updatedAt: new Date(),
          mergedFrom: [...(primary.mergedFrom || []), secondary.firstName || secondary.name || "ลูกค้า"],
        },
      }
    );

    // ลบ secondary customer
    await db.collection("customers").deleteOne({ _id: new ObjectId(secondaryId) });

    // หลัง merge → รวม AI data (memory + analytics + skills)
    const agentUrl = process.env.AGENT_URL || "http://localhost:3000";
    await fetch(`${agentUrl}/api/customers/merge/consolidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryRooms: mergedRooms,
        secondaryRooms: secondary.rooms || [],
      }),
    }).catch(() => {
      console.log("[Merge] consolidate call failed — agent อาจไม่ online");
    });

    return NextResponse.json({
      status: "ok",
      merged: {
        primary: primaryId,
        deleted: secondaryId,
        rooms: mergedRooms.length,
        messages: mergedMessages,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production",
  });
  const userEmail = token?.email as string || "";
  if (!userEmail) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sourceId } = body;

  const db = await getDB();
  const now = new Date();

  if (sourceId) {
    // Mark specific conversation as seen
    await db.collection("user_last_seen").updateOne(
      { userEmail },
      {
        $set: {
          [`sourceLastSeen.${sourceId}`]: now,
          lastSeenAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  } else {
    // Mark all as seen
    await db.collection("user_last_seen").updateOne(
      { userEmail },
      {
        $set: { lastSeenAt: now, updatedAt: now },
        $setOnInsert: { createdAt: now, sourceLastSeen: {} },
      },
      { upsert: true }
    );
  }

  return NextResponse.json({ ok: true });
}

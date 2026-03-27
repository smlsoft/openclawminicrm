import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();

    const allowed = ["name", "sku", "category", "description", "price", "unit", "images", "status", "stock", "tags"];
    const updates: any = { updatedAt: new Date() };

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "price") updates[key] = Math.max(0, parseFloat(body[key]) || 0);
        else if (key === "stock") updates[key] = body[key] !== null && body[key] !== "" ? Math.max(0, parseInt(body[key])) : null;
        else if (key === "tags" && typeof body[key] === "string") updates[key] = body[key].split(",").map((t: string) => t.trim()).filter(Boolean);
        else updates[key] = body[key];
      }
    }

    await db.collection("products").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDB();
    await db.collection("products").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

/**
 * PUT /api/documents/:id — Admin แก้ไขหมวดหมู่ / status / notes
 * Admin สามารถ:
 * - ย้ายหมวดหมู่ (เช่น AI จำแนกผิด)
 * - เปลี่ยน status (pending → confirmed / rejected)
 * - เพิ่ม notes
 * - ย้ายไปเป็น "ภาพทั่วไป" ถ้า AI เข้าใจผิด
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const body = await request.json();
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production" });
    const staffName = (token?.name as string) || "admin";

    const CATEGORY_GROUPS: Record<string, string> = {
      payment_slip: "accounting", purchase_order: "accounting", quotation: "accounting",
      invoice: "accounting", receipt: "accounting", delivery_note: "accounting",
      id_card: "other_doc", business_doc: "other_doc", contract: "other_doc", product_spec: "other_doc",
      product_photo: "photo", site_photo: "photo", damage_photo: "photo", general: "photo",
    };

    const updates: any = { updatedAt: new Date() };

    // Admin เปลี่ยนหมวดหมู่
    if (body.category) {
      updates.category = body.category;
      updates.categoryGroup = CATEGORY_GROUPS[body.category] || "photo";
      updates.manualOverride = true;
      updates.overrideBy = staffName;
      updates.overrideAt = new Date();
    }

    // Admin เปลี่ยน status
    if (body.status === "confirmed") {
      updates.status = "confirmed";
      updates.confirmedBy = staffName;
      updates.confirmedAt = new Date();
    } else if (body.status === "rejected") {
      updates.status = "rejected";
      updates.rejectedBy = staffName;
      updates.rejectedAt = new Date();
      updates.rejectedReason = body.rejectedReason || "";
    }

    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.amount !== undefined) updates.amount = body.amount;

    await db.collection("documents").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    await db.collection("documents").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

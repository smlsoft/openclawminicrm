import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * Document Classification System
 *
 * ทุกภาพที่ลูกค้าส่งเข้ามา AI จะจำแนกเป็นหมวดหมู่:
 *
 * === เอกสารบัญชี/การเงิน ===
 * - payment_slip    สลิปโอนเงิน
 * - purchase_order  ใบสั่งซื้อ (PO)
 * - quotation       ใบเสนอราคา
 * - invoice         ใบแจ้งหนี้ / ใบกำกับภาษี
 * - receipt         ใบเสร็จรับเงิน
 * - delivery_note   ใบส่งของ / ใบรับของ
 *
 * === เอกสารอื่น ===
 * - id_card         บัตรประชาชน / หนังสือเดินทาง
 * - business_doc    เอกสารบริษัท (หนังสือรับรอง, ใบอนุญาต)
 * - contract        สัญญา / ข้อตกลง
 * - product_spec    สเปคสินค้า / แบบก่อสร้าง / แปลน
 *
 * === ภาพทั่วไป ===
 * - product_photo   รูปสินค้า
 * - site_photo      รูปหน้างาน / ไซต์ก่อสร้าง
 * - damage_photo    รูปความเสียหาย / เคลม
 * - general         ภาพทั่วไป / อื่นๆ
 */

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const category = request.nextUrl.searchParams.get("category") || "";
    const group = request.nextUrl.searchParams.get("group") || ""; // accounting, other_doc, photo
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");

    const filter: any = {};
    if (category) filter.category = category;
    if (group) filter.categoryGroup = group;

    const [docs, total] = await Promise.all([
      db.collection("documents")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .toArray(),
      db.collection("documents").countDocuments(filter),
    ]);

    // Enrich with group names
    const sourceIds = [...new Set(docs.map(d => d.sourceId))];
    const metas = sourceIds.length > 0
      ? await db.collection("groups_meta").find({ sourceId: { $in: sourceIds } }, { projection: { sourceId: 1, groupName: 1 } }).toArray()
      : [];
    const metaMap = new Map(metas.map(m => [m.sourceId, m.groupName]));

    const result = docs.map(d => ({
      ...d,
      _id: d._id.toString(),
      roomName: metaMap.get(d.sourceId) || d.sourceId,
    }));

    return NextResponse.json({ documents: result, total, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["สินค้า", "บริการ", "อุปกรณ์", "วัสดุ", "อะไหล่", "อื่นๆ"];
const VALID_UNITS = ["ชิ้น", "ต้น", "งาน", "เมตร", "ตร.ม.", "ชุด", "กล่อง", "ถุง", "กก.", "ลิตร", "คัน", "หลัง", "ห้อง", "รายการ"];
const VALID_STATUSES = ["active", "inactive"];

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const category = request.nextUrl.searchParams.get("category") || "";
    const status = request.nextUrl.searchParams.get("status") || "";
    const search = request.nextUrl.searchParams.get("search") || "";
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");

    const filter: any = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      db.collection("products").find(filter).sort({ createdAt: -1 }).skip(page * limit).limit(limit).toArray(),
      db.collection("products").countDocuments(filter),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({ ...p, _id: p._id.toString() })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDB();
    const body = await request.json();

    const doc = {
      name: (body.name || "").trim(),
      sku: (body.sku || "").trim(),
      category: VALID_CATEGORIES.includes(body.category) ? body.category : "อื่นๆ",
      description: (body.description || "").trim(),
      price: Math.max(0, parseFloat(body.price) || 0),
      unit: VALID_UNITS.includes(body.unit) ? body.unit : "ชิ้น",
      images: Array.isArray(body.images) ? body.images : [],
      status: VALID_STATUSES.includes(body.status) ? body.status : "active",
      stock: body.stock !== null && body.stock !== undefined && body.stock !== "" ? Math.max(0, parseInt(body.stock)) : null,
      tags: Array.isArray(body.tags) ? body.tags : (body.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!doc.name) {
      return NextResponse.json({ error: "กรุณาระบุชื่อสินค้า" }, { status: 400 });
    }

    const result = await db.collection("products").insertOne(doc);
    return NextResponse.json({ ok: true, _id: result.insertedId.toString(), ...doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

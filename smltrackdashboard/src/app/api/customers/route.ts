import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const q = request.nextUrl.searchParams.get("q");

    let filter: any = {};
    if (q && q.length >= 2) {
      filter = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      };
    }

    const customers = await db.collection("customers").find(filter).sort({ updatedAt: -1 }).limit(100).toArray();
    return NextResponse.json(customers.map((c) => ({ ...c, _id: c._id.toString() })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

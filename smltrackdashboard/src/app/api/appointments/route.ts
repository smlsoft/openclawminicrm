import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * Appointment System — ระบบนัดหมายสำหรับธุรกิจบริการ
 *
 * Schema:
 * {
 *   _id, title, description,
 *   customerId?, customerName, phone?, email?,
 *   staffName, staffNames: string[],  // ผู้รับผิดชอบ (หลายคนได้)
 *   date: Date,         // วันนัด
 *   startTime: string,  // "09:00"
 *   endTime: string,    // "10:00"
 *   duration: number,   // นาที
 *   type: string,       // ประเภท: site_visit, consultation, delivery, installation, meeting, follow_up, other
 *   location?: string,  // สถานที่
 *   status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show",
 *   priority: "high" | "medium" | "low",
 *   notes?: string,
 *   reminder: boolean,  // ส่งแจ้งเตือนก่อนนัด
 *   reminderMinutes: number, // แจ้งเตือนกี่นาทีก่อน (30, 60, 120, 1440)
 *   sourceId?: string,  // ห้องสนทนาที่เกี่ยวข้อง
 *   platform?: string,
 *   recurring?: { type: "none" | "daily" | "weekly" | "monthly", endDate?: Date },
 *   createdBy: string,
 *   createdAt: Date,
 *   updatedAt: Date,
 * }
 */

const VALID_TYPES = ["site_visit", "consultation", "delivery", "installation", "meeting", "follow_up", "other"];
const VALID_STATUSES = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const status = request.nextUrl.searchParams.get("status") || "";
    const type = request.nextUrl.searchParams.get("type") || "";
    const from = request.nextUrl.searchParams.get("from") || "";
    const to = request.nextUrl.searchParams.get("to") || "";
    const staff = request.nextUrl.searchParams.get("staff") || "";

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (staff) filter.staffNames = staff;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to + "T23:59:59");
    }

    const appointments = await db.collection("appointments")
      .find(filter)
      .sort({ date: 1, startTime: 1 })
      .limit(200)
      .toArray();

    // Stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);

    const [todayCount, weekCount, upcomingCount, overdueCount] = await Promise.all([
      db.collection("appointments").countDocuments({ date: { $gte: todayStart, $lt: todayEnd }, status: { $nin: ["cancelled", "completed"] } }),
      db.collection("appointments").countDocuments({ date: { $gte: todayStart, $lt: weekEnd }, status: { $nin: ["cancelled", "completed"] } }),
      db.collection("appointments").countDocuments({ date: { $gte: now }, status: { $nin: ["cancelled", "completed"] } }),
      db.collection("appointments").countDocuments({ date: { $lt: todayStart }, status: { $in: ["scheduled", "confirmed"] } }),
    ]);

    const byStatus = await db.collection("appointments").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();

    const byType = await db.collection("appointments").aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]).toArray();

    return NextResponse.json({
      appointments: appointments.map(a => ({ ...a, _id: a._id.toString() })),
      stats: {
        today: todayCount,
        thisWeek: weekCount,
        upcoming: upcomingCount,
        overdue: overdueCount,
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
      },
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
      title: body.title || "",
      description: body.description || "",
      customerId: body.customerId || null,
      customerName: body.customerName || "",
      phone: body.phone || "",
      email: body.email || "",
      staffName: body.staffName || "",
      staffNames: body.staffNames || (body.staffName ? [body.staffName] : []),
      date: new Date(body.date),
      startTime: body.startTime || "09:00",
      endTime: body.endTime || "10:00",
      duration: body.duration || 60,
      type: VALID_TYPES.includes(body.type) ? body.type : "other",
      location: body.location || "",
      status: "scheduled",
      priority: ["high", "medium", "low"].includes(body.priority) ? body.priority : "medium",
      notes: body.notes || "",
      reminder: body.reminder !== false,
      reminderMinutes: body.reminderMinutes || 60,
      sourceId: body.sourceId || null,
      platform: body.platform || null,
      recurring: body.recurring || { type: "none" },
      createdBy: body.createdBy || "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("appointments").insertOne(doc);
    return NextResponse.json({ ok: true, id: result.insertedId.toString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

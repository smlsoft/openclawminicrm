import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy → Agent: อัพโหลดรูปภาพ (forward multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const agentUrl = process.env.AGENT_URL || "http://localhost:3000";

    // สร้าง FormData ใหม่สำหรับ forward
    const forwardForm = new FormData();
    const file = formData.get("image");
    if (!file) {
      return NextResponse.json({ error: "ไม่มีไฟล์รูปภาพ" }, { status: 400 });
    }
    forwardForm.append("image", file);

    const res = await fetch(`${agentUrl}/api/inbox/upload`, {
      method: "POST",
      body: forwardForm,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "upload failed");
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

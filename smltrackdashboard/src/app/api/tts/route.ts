import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EDGE_TTS_URL = process.env.EDGE_TTS_URL || "http://edge-tts:5050";

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "th-TH-PremwadeeNeural", speed = 1.2 } = await req.json();
    if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });

    const res = await fetch(`${EDGE_TTS_URL}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1",
        input: text.substring(0, 200), // จำกัดความยาว
        voice,
        speed,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      // fallback: return empty — frontend จะใช้ Web Speech API แทน
      return NextResponse.json({ error: "tts unavailable" }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "tts error" }, { status: 500 });
  }
}

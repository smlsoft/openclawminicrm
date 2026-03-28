import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Next.js 16: proxy.ts แทน middleware.ts — รัน Node.js runtime เสมอ
// Dev mode: ไม่มี GOOGLE_CLIENT_ID → ข้าม auth ทั้งหมด

export async function proxy(req: NextRequest) {
  // Dev mode — ผ่านได้เลยถ้าไม่มี NEXTAUTH_SECRET (local dev)
  if (!process.env.NEXTAUTH_SECRET) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Public paths — ไม่ต้อง auth (basePath ถูก strip แล้ว)
  const publicPaths = [
    "/login",
    "/api/auth",
    "/api/seed",
    "/api/rebuild",
    "/api/notifications",
    "/api/visitor-count",
    "/api/tts",
    "/api/ceo-review",
    "/_next",
    "/favicon.ico",
  ];

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // ตรวจ JWT token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production",
  });

  // Demo guard — block mutations สำหรับ demo user
  if (token?.email === "demo@smlsoft.com" && req.method !== "GET") {
    const readOnlyPaths = ["/api/settings", "/api/config", "/api/team", "/api/km", "/api/onboarding", "/api/account"];
    const isBlocked = readOnlyPaths.some((p) => pathname.startsWith(p));
    if (isBlocked) {
      return NextResponse.json(
        { error: "Demo mode — ดูได้อย่างเดียว ไม่สามารถแก้ไขได้" },
        { status: 403 }
      );
    }
  }

  if (!token) {
    // redirect ไป login page (ใช้ NEXTAUTH_URL เพื่อหลีกเลี่ยง internal hostname)
    const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const loginUrl = new URL("/dashboard/login", origin);
    loginUrl.searchParams.set("callbackUrl", `${origin}${req.nextUrl.pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // basePath ถูก strip อัตโนมัติ — matcher ไม่ต้องใส่ /dashboard
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

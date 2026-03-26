import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Next.js 16: proxy.ts แทน middleware.ts — รัน Node.js runtime เสมอ
// Dev mode: ไม่มี GOOGLE_CLIENT_ID → ข้าม auth ทั้งหมด

export async function proxy(req: NextRequest) {
  // Dev mode — ผ่านได้เลย (check at runtime, not build time)
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Public paths — ไม่ต้อง auth
  const publicPaths = [
    "/dashboard/login",
    "/dashboard/api/auth",
    "/dashboard/_next",
    "/dashboard/favicon.ico",
  ];

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // ตรวจ JWT token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production",
  });

  if (!token) {
    // redirect ไป login page
    const loginUrl = new URL("/dashboard/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match ทุก path ใต้ /dashboard ยกเว้น static files
  matcher: ["/dashboard/:path*"],
};

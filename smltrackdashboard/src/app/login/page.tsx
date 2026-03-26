"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  // ถ้า login แล้ว redirect ไปหน้าหลัก หรือ onboarding ถ้ายังไม่ setup
  useEffect(() => {
    if (status === "authenticated") {
      const setupComplete = (session?.user as any)?.setupComplete;
      if (setupComplete === false) {
        router.replace("/onboarding");
      } else {
        router.replace("/");
      }
    }
  }, [status, session, router]);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    // ใช้ credentials provider สำหรับ demo
    await signIn("google", {
      callbackUrl: "/dashboard",
      login_hint: "smldemocrm@gmail.com",
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <div className="theme-bg-secondary backdrop-blur-xl border theme-border rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30 mb-4">
              💬
            </div>
            <h1 className="text-2xl font-bold theme-text tracking-tight">
              OpenClaw Mini CRM
            </h1>
            <p className="text-sm theme-text-secondary mt-1 text-center">
              AI Chat Intelligence
              <br />
              <span className="theme-text-muted">LINE · Facebook · Instagram</span>
            </p>
          </div>

          {/* Divider */}
          <div className="border-t theme-border mb-6" />

          {/* Google Sign In Button */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg"
          >
            {/* Google Icon SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t theme-border" />
            <span className="text-xs theme-text-muted">หรือ</span>
            <div className="flex-1 border-t theme-border" />
          </div>

          {/* Demo Login Button */}
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:from-indigo-700 active:to-cyan-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <span className="text-xl">🦐</span>
            <span>{demoLoading ? "กำลังเข้าสู่ระบบ..." : "ทดลองใช้งาน Demo"}</span>
          </button>

          {/* Footer note */}
          <p className="text-center text-xs theme-text-muted mt-4">
            Demo: ดูข้อมูลตัวอย่าง ทดลองฟีเจอร์ทั้งหมด
          </p>
        </div>

        {/* Version */}
        <p className="text-center text-xs theme-text-muted mt-4">
          OpenClaw Mini CRM v1.0
        </p>
      </div>
    </div>
  );
}

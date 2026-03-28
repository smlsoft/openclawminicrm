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
    await signIn("credentials", {
      email: "demo@smlsoft.com",
      callbackUrl: "/dashboard/kung-room",
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
    <div className="min-h-screen theme-bg flex items-center justify-center px-3 md:px-4 pb-24 md:pb-0">
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
              น้องกุ้ง AI คุมทั้งระบบ
              <br />
              <span className="theme-text-muted">LINE · Facebook · Instagram</span>
            </p>
          </div>

          {/* Divider */}
          <div className="border-t theme-border mb-6" />

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

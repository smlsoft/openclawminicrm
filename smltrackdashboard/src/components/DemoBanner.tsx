"use client";

import { useIsDemo } from "@/hooks/useIsDemo";

export function DemoBanner() {
  const isDemo = useIsDemo();
  if (!isDemo) return null;
  return (
    <div className="bg-amber-900/50 border-b border-amber-700/50 px-4 py-2 text-center text-sm text-amber-300">
      Demo Mode — ดูได้อย่างเดียว ไม่สามารถแก้ไขได้
    </div>
  );
}

export function DemoGuard({ children }: { children: React.ReactNode }) {
  const isDemo = useIsDemo();
  if (isDemo) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-60">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/80 backdrop-blur px-6 py-3 rounded-xl border border-amber-500/30 text-amber-300 text-sm font-medium">
            Demo Mode — ดูได้อย่างเดียว
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

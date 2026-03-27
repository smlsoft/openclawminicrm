"use client";

import { createContext, useContext, ReactNode } from "react";
import { useNotifications, NotificationState } from "@/hooks/useNotifications";
import Link from "next/link";

const NotificationContext = createContext<NotificationState>({
  totalUnread: 0,
  pendingPayments: 0,
  conversations: [],
  toasts: [],
  connected: false,
  dismissToast: () => {},
  markSeen: () => {},
  markAllSeen: () => {},
});

export function useNotificationContext() {
  return useContext(NotificationContext);
}

const PLATFORM_ICONS: Record<string, { emoji: string; color: string }> = {
  line: { emoji: "💚", color: "bg-green-500" },
  facebook: { emoji: "💙", color: "bg-blue-500" },
  instagram: { emoji: "💜", color: "bg-pink-500" },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notifications = useNotifications();

  return (
    <NotificationContext.Provider value={notifications}>
      {children}

      {/* Toast container — fixed top-right */}
      {notifications.toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
          {notifications.toasts.map((toast) => {
            const pf = PLATFORM_ICONS[toast.platform] || PLATFORM_ICONS.line;
            return (
              <div
                key={toast.id}
                className="animate-slide-in rounded-xl border p-3 shadow-lg backdrop-blur-xl cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-strong)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
                onClick={() => notifications.dismissToast(toast.id)}
              >
                <Link href="/chat" className="block" onClick={() => notifications.markSeen(toast.sourceId)}>
                  <div className="flex items-start gap-2.5">
                    <span className={`w-8 h-8 rounded-lg ${pf.color} flex items-center justify-center text-sm text-white shrink-0`}>
                      {pf.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {toast.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: "var(--primary-bg)", color: "var(--primary)" }}>
                          ใหม่
                        </span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {toast.user}: {toast.message}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); notifications.dismissToast(toast.id); }}
                      className="text-xs shrink-0 mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
      `}</style>
    </NotificationContext.Provider>
  );
}

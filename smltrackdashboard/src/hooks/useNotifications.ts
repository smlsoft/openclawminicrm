"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface UnreadConversation {
  sourceId: string;
  name: string;
  platform: string;
  count: number;
  lastMessage: string;
  lastUser: string;
  lastAt: string | null;
}

interface Toast {
  id: string;
  sourceId: string;
  name: string;
  platform: string;
  message: string;
  user: string;
  time: number;
}

export interface NotificationState {
  totalUnread: number;
  pendingPayments: number;
  conversations: UnreadConversation[];
  toasts: Toast[];
  connected: boolean;
  dismissToast: (id: string) => void;
  markSeen: (sourceId: string) => void;
  markAllSeen: () => void;
}

export function useNotifications(): NotificationState {
  const { status } = useSession();
  const [totalUnread, setTotalUnread] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [connected, setConnected] = useState(false);
  const prevTotalRef = useRef(0);
  const canPlaySoundRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Enable sound after first user interaction
  useEffect(() => {
    const enable = () => { canPlaySoundRef.current = true; };
    document.addEventListener("click", enable, { once: true });
    document.addEventListener("touchstart", enable, { once: true });
    return () => {
      document.removeEventListener("click", enable);
      document.removeEventListener("touchstart", enable);
    };
  }, []);

  // SSE connection
  useEffect(() => {
    if (status !== "authenticated") return;

    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    const connect = () => {
      es = new EventSource("/dashboard/api/notifications/stream");

      es.addEventListener("unread", (e) => {
        try {
          const data = JSON.parse(e.data);
          const newTotal = data.total || 0;
          const newConvs: UnreadConversation[] = data.conversations || [];

          // ถ้ามีข้อความใหม่ → สร้าง toast + เล่นเสียง
          if (newTotal > prevTotalRef.current && prevTotalRef.current > 0) {
            // หา conversations ที่มีข้อความใหม่
            for (const conv of newConvs) {
              const prevConv = conversations.find(c => c.sourceId === conv.sourceId);
              if (!prevConv || conv.count > prevConv.count) {
                const toast: Toast = {
                  id: `${conv.sourceId}-${Date.now()}`,
                  sourceId: conv.sourceId,
                  name: conv.name,
                  platform: conv.platform,
                  message: conv.lastMessage,
                  user: conv.lastUser,
                  time: Date.now(),
                };
                setToasts(prev => [toast, ...prev].slice(0, 5));

                // Play sound
                if (canPlaySoundRef.current) {
                  try {
                    if (!audioRef.current) {
                      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgip60teleNjp2markup8markup");
                      // Simple beep sound using Web Audio API instead
                      const ctx = new AudioContext();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.frequency.value = 800;
                      gain.gain.value = 0.3;
                      osc.start();
                      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                      osc.stop(ctx.currentTime + 0.3);
                    }
                  } catch {}
                }
                break; // 1 toast per update
              }
            }
          }

          prevTotalRef.current = newTotal;
          setTotalUnread(newTotal);
          setPendingPayments(data.pendingPayments || 0);
          setConversations(newConvs);
        } catch {}
      });

      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [status]);

  // Auto-dismiss toasts after 8 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => Date.now() - t.time < 8000));
    }, 8000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markSeen = useCallback(async (sourceId: string) => {
    try {
      await fetch("/dashboard/api/notifications/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      setConversations(prev => prev.filter(c => c.sourceId !== sourceId));
      setTotalUnread(prev => {
        const conv = conversations.find(c => c.sourceId === sourceId);
        return Math.max(0, prev - (conv?.count || 0));
      });
    } catch {}
  }, [conversations]);

  const markAllSeen = useCallback(async () => {
    try {
      await fetch("/dashboard/api/notifications/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setTotalUnread(0);
      setConversations([]);
    } catch {}
  }, []);

  return { totalUnread, pendingPayments, conversations, toasts, connected, dismissToast, markSeen, markAllSeen };
}

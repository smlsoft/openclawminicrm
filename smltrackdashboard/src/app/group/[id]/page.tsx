"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";

interface Message {
  _id: string;
  role: "user" | "assistant";
  userName?: string;
  content: string;
  messageType: string;
  imageUrl?: string | null;
  createdAt?: string;
}

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    fetch(`/dashboard/api/groups/${id}/messages?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, [id]);

  // Auto refresh every 1 second
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMessages, 1000);
    return () => clearInterval(interval);
  }, [id, autoRefresh]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="min-h-screen theme-bg theme-text flex flex-col">
      {/* Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img
            src={zoomImage}
            alt="Zoomed"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/80"
            onClick={() => setZoomImage(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-3 sticky top-0 theme-bg z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="theme-text-secondary hover:theme-text text-xl">
              &larr;
            </Link>
            <div>
              <h1 className="font-bold">{id}</h1>
              <p className="text-xs theme-text-secondary">{messages.length} messages</p>
            </div>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-3 py-1 rounded-full ${
              autoRefresh
                ? "bg-green-600 text-white"
                : "theme-bg-card theme-text-secondary"
            }`}
          >
            {autoRefresh ? "Live" : "Paused"}
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-3">
          {loading ? (
            <div className="text-center theme-text-muted py-20">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center theme-text-muted py-20">No messages yet</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${
                  msg.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.role === "assistant"
                      ? "theme-bg-card rounded-bl-sm"
                      : "bg-green-700 rounded-br-sm"
                  }`}
                >
                  {/* User name */}
                  {msg.role === "user" && msg.userName && (
                    <p className="text-xs text-green-300 font-medium mb-1">
                      {msg.userName}
                    </p>
                  )}
                  {msg.role === "assistant" && (
                    <p className="text-xs text-blue-400 font-medium mb-1">
                      น้องกุ้ง
                    </p>
                  )}

                  {/* Image with zoom */}
                  {msg.imageUrl && (
                    <div className="mb-2">
                      <img
                        src={msg.imageUrl}
                        alt="Shared image"
                        className="rounded-lg max-w-full max-h-60 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                        onClick={() => setZoomImage(msg.imageUrl!)}
                      />
                    </div>
                  )}

                  {/* Text */}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  {/* Time */}
                  {msg.createdAt && (
                    <p className="text-[10px] theme-text-muted mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}

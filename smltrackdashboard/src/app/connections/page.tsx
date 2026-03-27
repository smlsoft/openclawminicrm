"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface AccountData {
  lineConfig: { configured: boolean; channelAccessToken?: string };
  fbConfig: { configured: boolean };
  telegramChatId: string | null;
}

interface LineTestResult {
  ok: boolean;
  botName?: string;
  botId?: string;
  pictureUrl?: string;
  error?: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
      ok
        ? "bg-green-950/60 text-green-400 border border-green-800/50"
        : "theme-bg-card theme-text-muted border theme-border"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-gray-600"}`} />
      {label}
    </span>
  );
}

export default function ConnectionsPage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineTestResult, setLineTestResult] = useState<LineTestResult | null>(null);
  const [lineTesting, setLineTesting] = useState(false);

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/account");
      if (res.ok) setAccount(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const testLine = async () => {
    setLineTesting(true);
    setLineTestResult(null);
    setLineTestResult({ ok: false, error: "ไม่สามารถทดสอบได้โดยตรง — token ถูก mask ไว้เพื่อความปลอดภัย กรุณาตรวจสอบที่ Settings" });
    setLineTesting(false);
  };

  const lineOk = account?.lineConfig?.configured ?? false;
  const fbOk = account?.fbConfig?.configured ?? false;
  const igOk = account?.fbConfig?.configured ?? false;
  const telegramOk = !!account?.telegramChatId;

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Header */}
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 theme-bg backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="theme-text-secondary hover:theme-text transition text-sm">&larr; Dashboard</Link>
          <div className="w-px h-5 theme-border" />
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center text-sm">🔗</div>
          <h1 className="text-lg font-bold">เชื่อมต่อช่องทาง</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-4">

        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          {[
            { label: "LINE", ok: lineOk, icon: "💬" },
            { label: "Facebook", ok: fbOk, icon: "📘" },
            { label: "Instagram", ok: igOk, icon: "📸" },
            { label: "Telegram", ok: telegramOk, icon: "✈️" },
          ].map(({ label, ok, icon }) => (
            <div key={label} className={`rounded-xl p-3 border text-center ${ok ? "bg-green-950/30 border-green-800/40" : "theme-bg-secondary theme-border"}`}>
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-medium theme-text">{label}</p>
              <p className={`text-xs mt-0.5 ${ok ? "text-green-400" : "theme-text-muted"}`}>{ok ? "เชื่อมแล้ว" : "ยังไม่ได้ตั้ง"}</p>
            </div>
          ))}
        </div>

        {/* LINE */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-900/40 rounded-2xl flex items-center justify-center text-2xl">💬</div>
              <div>
                <h2 className="font-semibold">LINE Official Account</h2>
                <p className="text-xs theme-text-muted mt-0.5">รับ-ส่งข้อความ LINE ผ่านบอท</p>
              </div>
            </div>
            <StatusBadge ok={lineOk} label={lineOk ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"} />
          </div>

          {lineOk ? (
            <div className="space-y-3">
              <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {lineTestResult?.pictureUrl && (
                    <img src={lineTestResult.pictureUrl} alt="bot" className="w-10 h-10 rounded-full border border-green-700" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-green-300">
                      {lineTestResult?.botName || "LINE OA ตั้งค่าแล้ว"}
                    </p>
                    {lineTestResult?.botId && (
                      <p className="text-xs theme-text-secondary font-mono">{lineTestResult.botId}</p>
                    )}
                    {!lineTestResult && (
                      <p className="text-xs theme-text-muted">Channel Access Token และ Secret ถูกตั้งค่าแล้ว</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="theme-bg-card border theme-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium theme-text-secondary">Webhook URL</p>
                <code className="text-xs text-indigo-300 font-mono block break-all">
                  https://smlclaw.satistang.com/webhook
                </code>
                <p className="text-xs theme-text-muted">ตั้งค่าที่ LINE Developers Console → Messaging API → Webhook URL</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={testLine}
                  disabled={lineTesting}
                  className="px-4 py-2 bg-green-900/50 hover:bg-green-800/50 border border-green-800/50 rounded-lg text-xs text-green-400 hover:text-white transition"
                >
                  {lineTesting ? "กำลังตรวจสอบ..." : "ตรวจสอบสถานะ"}
                </button>
                <Link
                  href="/dashboard/settings"
                  className="px-4 py-2 theme-bg-card hover:theme-bg-hover border theme-border rounded-lg text-xs theme-text-secondary hover:theme-text transition"
                >
                  แก้ไข Token
                </Link>
              </div>

              {lineTestResult && (
                <div className={`p-3 rounded-xl border text-xs ${lineTestResult.ok ? "bg-green-950/50 border-green-800" : "bg-amber-950/50 border-amber-800"}`}>
                  {lineTestResult.ok ? (
                    <p className="text-green-400">✅ {lineTestResult.botName}</p>
                  ) : (
                    <p className="text-amber-400">⚠️ {lineTestResult.error}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm theme-text-secondary">ยังไม่ได้เชื่อมต่อ LINE OA</p>
              <div className="space-y-2 text-xs theme-text-muted">
                <p>วิธีตั้งค่า:</p>
                <ol className="list-decimal list-inside space-y-1 theme-text-muted">
                  <li>ไปที่ <a href="https://developers.line.biz" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition">LINE Developers Console</a></li>
                  <li>สร้าง Channel หรือเปิด Channel ที่มีอยู่</li>
                  <li>คัดลอก Channel Access Token และ Channel Secret</li>
                  <li>ใส่ใน Settings → LINE OA</li>
                </ol>
              </div>
              <Link
                href="/dashboard/settings"
                className="inline-block px-5 py-2.5 bg-green-800 hover:bg-green-700 rounded-xl text-sm font-medium text-white transition"
              >
                ตั้งค่า LINE OA →
              </Link>
            </div>
          )}
        </section>

        {/* Facebook */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center text-2xl">📘</div>
              <div>
                <h2 className="font-semibold">Facebook Messenger</h2>
                <p className="text-xs theme-text-muted mt-0.5">รับข้อความจาก Facebook Page</p>
              </div>
            </div>
            <StatusBadge ok={fbOk} label={fbOk ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"} />
          </div>

          {fbOk ? (
            <div className="space-y-3">
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
                <p className="text-sm text-blue-300">Facebook Page ตั้งค่าแล้ว</p>
                <p className="text-xs theme-text-muted mt-1">Page Access Token และ App Secret ถูกตั้งค่าแล้ว</p>
              </div>
              <Link
                href="/dashboard/settings"
                className="inline-block px-4 py-2 theme-bg-card hover:theme-bg-hover border theme-border rounded-lg text-xs theme-text-secondary hover:theme-text transition"
              >
                แก้ไขการตั้งค่า
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm theme-text-secondary">ยังไม่ได้เชื่อมต่อ Facebook</p>
              <Link
                href="/dashboard/settings"
                className="inline-block px-5 py-2.5 bg-blue-800 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition"
              >
                ตั้งค่า Facebook →
              </Link>
            </div>
          )}
        </section>

        {/* Instagram */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-900/40 rounded-2xl flex items-center justify-center text-2xl">📸</div>
              <div>
                <h2 className="font-semibold">Instagram Direct</h2>
                <p className="text-xs theme-text-muted mt-0.5">ใช้ Facebook token เดียวกัน</p>
              </div>
            </div>
            <StatusBadge ok={igOk} label={igOk ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"} />
          </div>

          <div className={`p-4 rounded-xl border text-sm ${igOk ? "bg-pink-950/30 border-pink-800/40 text-pink-200" : "theme-bg-card theme-border theme-text-secondary"}`}>
            {igOk ? (
              <p>Instagram ใช้ Page Access Token เดียวกับ Facebook — เชื่อมต่อแล้วอัตโนมัติ</p>
            ) : (
              <p>เชื่อมต่อ Facebook ก่อน แล้ว Instagram จะเชื่อมต่ออัตโนมัติ</p>
            )}
          </div>
        </section>

        {/* Telegram */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center text-2xl">✈️</div>
              <div>
                <h2 className="font-semibold">Telegram — น้องกุ้ง</h2>
                <p className="text-xs theme-text-muted mt-0.5">รับคำแนะนำ AI ทุก 1 ชั่วโมงผ่าน Telegram</p>
              </div>
            </div>
            <StatusBadge ok={telegramOk} label={telegramOk ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"} />
          </div>

          {telegramOk ? (
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
              <p className="text-sm text-blue-300">เชื่อมต่อ Telegram แล้ว</p>
              <p className="text-xs theme-text-secondary mt-1 font-mono">Chat ID: {account?.telegramChatId}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm theme-text-secondary">น้องกุ้ง (AI Advisor) จะส่งคำแนะนำทุก 1 ชั่วโมงมาให้คุณผ่าน Telegram</p>
              <div className="text-xs theme-text-muted space-y-1">
                <p>วิธีเชื่อมต่อ:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>กดปุ่มด้านล่างเพื่อเปิด Telegram Bot</li>
                  <li>กด Start และพิมพ์ <code className="text-indigo-400">/start</code></li>
                  <li>Bot จะบันทึก Chat ID ให้อัตโนมัติ</li>
                </ol>
              </div>
              <a
                href="https://t.me/SMLClawBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-xl text-sm font-medium text-white transition"
              >
                เปิด Telegram Bot →
              </a>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

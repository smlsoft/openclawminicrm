"use client";

import { useState } from "react";

type TestResult = { ok: boolean; [key: string]: unknown };

export default function ConfigPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // MongoDB
  const [mongoUri, setMongoUri] = useState("");
  const [mongoDb, setMongoDb] = useState("smlclaw");
  const [mongoResult, setMongoResult] = useState<TestResult | null>(null);
  const [mongoLoading, setMongoLoading] = useState(false);

  // LINE
  const [lineToken, setLineToken] = useState("");
  const [lineResult, setLineResult] = useState<TestResult | null>(null);
  const [lineLoading, setLineLoading] = useState(false);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/dashboard/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        setAuthed(true);
      } else {
        setAuthError(data.error || "รหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setAuthError("เชื่อมต่อไม่ได้");
    }
    setAuthLoading(false);
  };

  const testMongo = async () => {
    setMongoLoading(true);
    setMongoResult(null);
    try {
      const res = await fetch("/dashboard/api/config/mongodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: mongoUri, dbName: mongoDb }),
      });
      setMongoResult(await res.json());
    } catch {
      setMongoResult({ ok: false, error: "เชื่อมต่อไม่ได้" });
    }
    setMongoLoading(false);
  };

  const testLine = async () => {
    setLineLoading(true);
    setLineResult(null);
    try {
      const res = await fetch("/dashboard/api/config/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelAccessToken: lineToken }),
      });
      setLineResult(await res.json());
    } catch {
      setLineResult({ ok: false, error: "เชื่อมต่อไม่ได้" });
    }
    setLineLoading(false);
  };

  // ---- Password Gate ----
  if (!authed) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="theme-bg-secondary border theme-border rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 theme-bg-card rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
              🔒
            </div>
            <h1 className="text-xl font-bold theme-text">OpenClaw Mini CRM Config</h1>
            <p className="text-sm theme-text-secondary mt-1">กรอกรหัสผ่านเพื่อเข้าถึง</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="รหัสผ่าน"
              className="w-full px-4 py-3 theme-input border theme-border rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              autoFocus
            />
            {authError && (
              <p className="text-red-400 text-sm text-center">{authError}</p>
            )}
            <button
              onClick={handleAuth}
              disabled={authLoading || !password}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-white font-medium transition"
            >
              {authLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Config Panel ----
  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="border-b theme-border px-3 md:px-6 py-4 sticky top-0 theme-bg backdrop-blur z-10">
        <div>
          <h1 className="text-base font-bold">🔗 ช่องทางเชื่อมต่อ</h1>
          <p className="text-xs theme-text-secondary">ตั้งค่า LINE, Facebook, Instagram, Telegram</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">

        {/* MongoDB Atlas */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-900/50 rounded-xl flex items-center justify-center text-xl">🍃</div>
            <div>
              <h2 className="text-base font-semibold">MongoDB Atlas</h2>
              <p className="text-xs theme-text-secondary">เชื่อมต่อฐานข้อมูล</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs theme-text-secondary mb-1 block">Connection URI</label>
              <input
                type="password"
                value={mongoUri}
                onChange={(e) => setMongoUri(e.target.value)}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                className="w-full px-4 py-2.5 theme-input border theme-border rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition font-mono"
              />
            </div>
            <div>
              <label className="text-xs theme-text-secondary mb-1 block">Database Name</label>
              <input
                type="text"
                value={mongoDb}
                onChange={(e) => setMongoDb(e.target.value)}
                placeholder="smlclaw"
                className="w-full px-4 py-2.5 theme-input border theme-border rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition font-mono"
              />
            </div>
            <button
              onClick={testMongo}
              disabled={mongoLoading || !mongoUri}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition"
            >
              {mongoLoading ? "กำลังทดสอบ..." : "🔌 ทดสอบการเชื่อมต่อ"}
            </button>
          </div>

          {/* MongoDB Result */}
          {mongoResult && (
            <div className={`mt-4 p-4 rounded-xl border text-sm ${mongoResult.ok ? "bg-green-950/50 border-green-800" : "bg-red-950/50 border-red-800"}`}>
              {mongoResult.ok ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-medium">
                    <span>✅</span> เชื่อมต่อสำเร็จ!
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs theme-text-secondary">
                    <div>Database: <span className="theme-text font-mono">{String(mongoResult.database)}</span></div>
                    <div>Documents: <span className="theme-text font-mono">{String(mongoResult.documentCount)}</span></div>
                    <div>Storage: <span className="theme-text font-mono">{String(mongoResult.storageMB)} MB</span></div>
                    <div>Collections: <span className="theme-text font-mono">{String((mongoResult.collections as string[])?.length || 0)}</span></div>
                  </div>
                  {Array.isArray(mongoResult.collections) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(mongoResult.collections as string[]).map((c: string) => (
                        <span key={c} className="px-2 py-0.5 bg-green-900/50 rounded text-xs text-green-300 font-mono">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <span>❌</span> {String(mongoResult.error)}
                </div>
              )}
            </div>
          )}
        </section>

        {/* LINE OA */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center text-xl">💬</div>
            <div>
              <h2 className="text-base font-semibold">LINE Official Account</h2>
              <p className="text-xs theme-text-secondary">ทดสอบการเชื่อมต่อ LINE OA</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs theme-text-secondary mb-1 block">Channel Access Token</label>
              <input
                type="password"
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                placeholder="Channel Access Token จาก LINE Developers"
                className="w-full px-4 py-2.5 theme-input border theme-border rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
              />
            </div>
            <button
              onClick={testLine}
              disabled={lineLoading || !lineToken}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition"
            >
              {lineLoading ? "กำลังทดสอบ..." : "💬 ทดสอบ LINE OA"}
            </button>
          </div>

          {/* LINE Result */}
          {lineResult && (
            <div className={`mt-4 p-4 rounded-xl border text-sm ${lineResult.ok ? "bg-emerald-950/50 border-emerald-800" : "bg-red-950/50 border-red-800"}`}>
              {lineResult.ok ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span>✅</span> เชื่อมต่อ LINE OA สำเร็จ!
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {typeof lineResult.pictureUrl === "string" && (
                      <img
                        src={String(lineResult.pictureUrl)}
                        alt="Bot"
                        className="w-12 h-12 rounded-full border-2 border-emerald-700"
                      />
                    )}
                    <div className="text-xs theme-text-secondary space-y-1">
                      <div>ชื่อบอท: <span className="theme-text font-semibold">{String(lineResult.botName)}</span></div>
                      <div>Bot ID: <span className="theme-text font-mono">{String(lineResult.botId)}</span></div>
                      {typeof lineResult.premium === "string" && (
                        <div>Premium ID: <span className="theme-text font-mono">{String(lineResult.premium)}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <span>❌</span> {String(lineResult.error)}
                </div>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

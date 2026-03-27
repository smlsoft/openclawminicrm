"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3 | 4 | 5;

interface TestResult {
  ok: boolean;
  error?: string;
  collections?: string[];
  documentCount?: number;
  botName?: string;
  botId?: string;
  pictureUrl?: string;
}

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 2 — MongoDB
  const [mongoUri, setMongoUri] = useState("");
  const [mongoTest, setMongoTest] = useState<TestResult | null>(null);
  const [mongoTesting, setMongoTesting] = useState(false);

  // Step 3 — AI Keys
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [sambaNovaKey, setSambaNovaKey] = useState("");
  const [cerebrasKey, setCerebrasKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");

  // Step 4 — Channels
  const [lineToken, setLineToken] = useState("");
  const [lineSecret, setLineSecret] = useState("");
  const [lineTest, setLineTest] = useState<TestResult | null>(null);
  const [lineTesting, setLineTesting] = useState(false);
  const [fbToken, setFbToken] = useState("");
  const [fbSecret, setFbSecret] = useState("");
  const [fbVerify, setFbVerify] = useState("");

  const totalSteps = 5;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  const testMongo = async () => {
    setMongoTesting(true);
    setMongoTest(null);
    try {
      const res = await fetch("/dashboard/api/account/test-mongodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: mongoUri }),
      });
      setMongoTest(await res.json());
    } catch {
      setMongoTest({ ok: false, error: "เชื่อมต่อไม่ได้" });
    }
    setMongoTesting(false);
  };

  const testLine = async () => {
    setLineTesting(true);
    setLineTest(null);
    try {
      const res = await fetch("/dashboard/api/account/test-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelAccessToken: lineToken }),
      });
      setLineTest(await res.json());
    } catch {
      setLineTest({ ok: false, error: "เชื่อมต่อไม่ได้" });
    }
    setLineTesting(false);
  };

  const saveAndNext = async (nextStep: Step) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};

      if (step === 2 && mongoUri) {
        body.mongodbUri = mongoUri;
      }
      if (step === 3) {
        body.aiKeys = {
          openrouterKey,
          groqKey,
          sambaNovaKey,
          cerebrasKey,
          googleKey,
        };
      }
      if (step === 4) {
        body.lineConfig = { channelAccessToken: lineToken, channelSecret: lineSecret };
        body.fbConfig = { pageAccessToken: fbToken, appSecret: fbSecret, verifyToken: fbVerify };
      }

      if (Object.keys(body).length > 0) {
        await fetch("/dashboard/api/account", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
    } catch {}
    setSaving(false);
    setStep(nextStep);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await fetch("/dashboard/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupComplete: true }),
      });
    } catch {}
    setSaving(false);
    router.replace("/");
  };

  const userName = session?.user?.name || "คุณ";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;

  return (
    <div className="min-h-screen theme-bg theme-text flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-3xl" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full h-1 theme-bg-card">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-3 md:px-6 py-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center text-base shadow-lg shadow-indigo-500/20">
            💬
          </div>
          <span className="font-bold text-sm">OpenClaw Mini CRM</span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                s === step
                  ? "bg-indigo-400 scale-125"
                  : s < step
                  ? "bg-indigo-600"
                  : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-3 md:px-6 py-8 pb-24 md:pb-8">
        <div className="w-full max-w-lg">

          {/* Step 1 — ยินดีต้อนรับ */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="inline-flex flex-col items-center">
                {userImage ? (
                  <img src={userImage} alt={userName} className="w-20 h-20 rounded-full border-2 border-indigo-500/50 shadow-xl mb-4" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-xl">
                    👤
                  </div>
                )}
                <h1 className="text-3xl font-bold">ยินดีต้อนรับ!</h1>
                <p className="text-xl text-indigo-300 mt-1">{userName}</p>
                <p className="text-sm theme-text-secondary mt-1">{userEmail}</p>
              </div>

              <div className="theme-bg-secondary border theme-border rounded-2xl p-6 text-left space-y-4">
                <h2 className="font-semibold theme-text">ตั้งค่า OpenClaw Mini CRM ของคุณ</h2>
                <p className="text-sm theme-text-secondary leading-relaxed">
                  ระบบนี้ฟรีทั้งหมด คุณใช้ MongoDB Atlas และ AI API key ของตัวเองได้เลย
                  ทำตามขั้นตอน 4 ขั้นตอนนี้เพื่อเริ่มต้น:
                </p>
                <div className="space-y-3">
                  {[
                    { icon: "🍃", label: "เชื่อมฐานข้อมูล MongoDB Atlas", desc: "สำหรับเก็บข้อความแชท" },
                    { icon: "🤖", label: "ตั้งค่า AI API Key", desc: "OpenRouter (จำเป็น) + ตัวอื่นเสริม" },
                    { icon: "💬", label: "เชื่อมช่องทาง (ข้ามได้)", desc: "LINE / Facebook / Instagram" },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{icon}</span>
                      <div>
                        <p className="text-sm font-medium theme-text">{label}</p>
                        <p className="text-xs theme-text-muted">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-indigo-500/20"
              >
                เริ่มตั้งค่า →
              </button>
            </div>
          )}

          {/* Step 2 — MongoDB */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">ขั้นตอนที่ 2 / 4</p>
                <h2 className="text-2xl font-bold">เชื่อมฐานข้อมูล</h2>
                <p className="text-sm theme-text-secondary mt-1">ใช้ MongoDB Atlas M0 (ฟรี) ของคุณเองสำหรับเก็บข้อมูลแชท</p>
              </div>

              <div className="theme-bg-secondary border theme-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b theme-border">
                  <div className="w-10 h-10 bg-green-900/40 rounded-xl flex items-center justify-center text-xl">🍃</div>
                  <div>
                    <p className="font-semibold">MongoDB Atlas</p>
                    <p className="text-xs theme-text-muted">atlas.mongodb.com</p>
                  </div>
                  <a
                    href="https://www.mongodb.com/atlas/database"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    สร้างฟรี →
                  </a>
                </div>

                <div>
                  <label className="text-xs theme-text-secondary mb-1.5 block">Connection String (mongodb+srv://...)</label>
                  <input
                    type="text"
                    value={mongoUri}
                    onChange={(e) => { setMongoUri(e.target.value); setMongoTest(null); }}
                    placeholder="mongodb+srv://user:password@cluster.mongodb.net/smltrack"
                    className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition font-mono"
                    autoComplete="off"
                  />
                  <p className="text-xs theme-text-muted mt-1">วาง Connection String จาก Atlas → Connect → Drivers</p>
                </div>

                <button
                  onClick={testMongo}
                  disabled={mongoTesting || !mongoUri.trim()}
                  className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl text-sm font-medium transition"
                >
                  {mongoTesting ? "กำลังทดสอบ..." : "🔌 ทดสอบการเชื่อมต่อ"}
                </button>

                {mongoTest && (
                  <div className={`p-4 rounded-xl border text-sm ${mongoTest.ok ? "bg-green-950/50 border-green-800" : "bg-red-950/50 border-red-800"}`}>
                    {mongoTest.ok ? (
                      <div className="space-y-2">
                        <p className="text-green-400 font-medium">✅ เชื่อมต่อสำเร็จ!</p>
                        <div className="flex gap-4 text-xs theme-text-secondary">
                          <span>เอกสาร: <span className="theme-text">{mongoTest.documentCount ?? 0}</span></span>
                          <span>Collections: <span className="theme-text">{mongoTest.collections?.length ?? 0}</span></span>
                        </div>
                        {mongoTest.collections && mongoTest.collections.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {mongoTest.collections.slice(0, 8).map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-green-900/50 text-green-300 text-xs rounded font-mono">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-400">❌ {mongoTest.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 theme-bg-card hover:theme-bg-hover rounded-xl text-sm font-medium transition"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  onClick={() => saveAndNext(3)}
                  disabled={saving || !mongoUri.trim()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition"
                >
                  {saving ? "กำลังบันทึก..." : "ถัดไป →"}
                </button>
              </div>
              {!mongoUri.trim() && (
                <p className="text-xs text-center theme-text-muted">กรุณากรอก MongoDB URI ก่อนไปต่อ</p>
              )}
            </div>
          )}

          {/* Step 3 — AI Keys */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">ขั้นตอนที่ 3 / 4</p>
                <h2 className="text-2xl font-bold">ตั้งค่า AI</h2>
                <p className="text-sm theme-text-secondary mt-1">ใช้ AI key ของคุณเอง — OpenRouter จำเป็น, ตัวอื่นเสริม</p>
              </div>

              <div className="theme-bg-secondary border theme-border rounded-2xl p-6 space-y-5">
                {/* OpenRouter — required */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium flex items-center gap-2">
                      🤖 OpenRouter API Key
                      <span className="text-xs bg-red-900/50 text-red-400 border border-red-800/50 px-1.5 py-0.5 rounded">จำเป็น</span>
                    </label>
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                      รับฟรี →
                    </a>
                  </div>
                  <input
                    type="password"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                    autoComplete="off"
                  />
                  <p className="text-xs theme-text-muted mt-1">ใช้สำหรับ LINE reply + AI Advisor (Qwen3-235B)</p>
                </div>

                <div className="border-t theme-border pt-4">
                  <p className="text-xs theme-text-muted mb-3 uppercase tracking-wider">เสริม — fallback providers (ฟรี)</p>
                  <div className="space-y-3">
                    {[
                      { label: "🟣 Groq API Key", value: groqKey, setter: setGroqKey, placeholder: "gsk_...", link: "https://console.groq.com/keys" },
                      { label: "🔵 SambaNova API Key", value: sambaNovaKey, setter: setSambaNovaKey, placeholder: "SambaNova API Key...", link: "https://cloud.sambanova.ai/" },
                      { label: "⚡ Cerebras API Key", value: cerebrasKey, setter: setCerebrasKey, placeholder: "csk-...", link: "https://cloud.cerebras.ai/" },
                      { label: "🌟 Google API Key", value: googleKey, setter: setGoogleKey, placeholder: "AIza...", link: "https://aistudio.google.com/apikey" },
                    ].map(({ label, value, setter, placeholder, link }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs theme-text-secondary">{label}</label>
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-400 transition">รับฟรี →</a>
                        </div>
                        <input
                          type="password"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-4 py-2 theme-input border rounded-xl text-xs focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition font-mono"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 theme-bg-card hover:theme-bg-hover rounded-xl text-sm font-medium transition"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  onClick={() => saveAndNext(4)}
                  disabled={saving || !openrouterKey.trim()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition"
                >
                  {saving ? "กำลังบันทึก..." : "ถัดไป →"}
                </button>
              </div>
              {!openrouterKey.trim() && (
                <p className="text-xs text-center theme-text-muted">กรุณากรอก OpenRouter API Key ก่อน</p>
              )}
            </div>
          )}

          {/* Step 4 — Channels */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">ขั้นตอนที่ 4 / 4</p>
                <h2 className="text-2xl font-bold">เชื่อมช่องทาง</h2>
                <p className="text-sm theme-text-secondary mt-1">ข้ามได้ ตั้งค่าทีหลังใน Settings ก็ได้</p>
              </div>

              <div className="space-y-4">
                {/* LINE */}
                <div className="theme-bg-secondary border theme-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-900/40 rounded-xl flex items-center justify-center text-lg">💬</div>
                    <div>
                      <p className="font-semibold text-sm">LINE Official Account</p>
                      <p className="text-xs theme-text-muted">LINE Developers Console</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs theme-text-muted mb-1 block">Channel Access Token</label>
                    <input
                      type="password"
                      value={lineToken}
                      onChange={(e) => { setLineToken(e.target.value); setLineTest(null); }}
                      placeholder="Channel Access Token"
                      className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="text-xs theme-text-muted mb-1 block">Channel Secret</label>
                    <input
                      type="password"
                      value={lineSecret}
                      onChange={(e) => setLineSecret(e.target.value)}
                      placeholder="Channel Secret"
                      className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition font-mono"
                      autoComplete="off"
                    />
                  </div>
                  {lineToken && (
                    <button
                      onClick={testLine}
                      disabled={lineTesting}
                      className="px-4 py-2 bg-green-800 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs font-medium transition"
                    >
                      {lineTesting ? "กำลังทดสอบ..." : "ทดสอบ LINE OA"}
                    </button>
                  )}
                  {lineTest && (
                    <div className={`p-3 rounded-xl border text-xs ${lineTest.ok ? "bg-green-950/50 border-green-800" : "bg-red-950/50 border-red-800"}`}>
                      {lineTest.ok ? (
                        <div className="flex items-center gap-2">
                          {lineTest.pictureUrl && <img src={lineTest.pictureUrl} alt="bot" className="w-8 h-8 rounded-full" />}
                          <div>
                            <p className="text-green-400 font-medium">✅ {lineTest.botName}</p>
                            <p className="theme-text-secondary">{lineTest.botId}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-red-400">❌ {lineTest.error}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Facebook / Instagram */}
                <div className="theme-bg-secondary border theme-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-900/40 rounded-xl flex items-center justify-center text-lg">📘</div>
                    <div>
                      <p className="font-semibold text-sm">Facebook / Instagram</p>
                      <p className="text-xs theme-text-muted">Meta Business Suite</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs theme-text-muted mb-1 block">Page Access Token</label>
                    <input
                      type="password"
                      value={fbToken}
                      onChange={(e) => setFbToken(e.target.value)}
                      placeholder="EAAxxxxxxxx..."
                      className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs theme-text-muted mb-1 block">App Secret</label>
                      <input
                        type="password"
                        value={fbSecret}
                        onChange={(e) => setFbSecret(e.target.value)}
                        placeholder="App Secret"
                        className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition font-mono"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="text-xs theme-text-muted mb-1 block">Verify Token</label>
                      <input
                        type="text"
                        value={fbVerify}
                        onChange={(e) => setFbVerify(e.target.value)}
                        placeholder="ตั้งเองได้เลย"
                        className="w-full px-4 py-2.5 theme-input border rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-3 theme-bg-card hover:theme-bg-hover rounded-xl text-sm font-medium transition"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  onClick={() => saveAndNext(5)}
                  disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition"
                >
                  {saving ? "กำลังบันทึก..." : "ถัดไป →"}
                </button>
              </div>
              <button
                onClick={() => saveAndNext(5)}
                className="w-full py-2 text-xs theme-text-muted hover:theme-text-secondary transition"
              >
                ข้ามขั้นตอนนี้ก่อน →
              </button>
            </div>
          )}

          {/* Step 5 — Done */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <div>
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl shadow-green-500/20">
                  🎉
                </div>
                <h2 className="text-3xl font-bold">เสร็จแล้ว!</h2>
                <p className="theme-text-secondary mt-2">ระบบพร้อมใช้งานแล้ว</p>
              </div>

              <div className="theme-bg-secondary border theme-border rounded-2xl p-6 text-left space-y-3">
                <p className="text-sm font-semibold theme-text mb-3">สรุปการตั้งค่า</p>
                {[
                  { icon: "🍃", label: "MongoDB Atlas", status: mongoUri ? "✅ เชื่อมแล้ว" : "⚠️ ยังไม่ได้ตั้งค่า", ok: !!mongoUri },
                  { icon: "🤖", label: "OpenRouter API Key", status: openrouterKey ? "✅ ตั้งค่าแล้ว" : "⚠️ ยังไม่ได้ตั้งค่า", ok: !!openrouterKey },
                  { icon: "💬", label: "LINE OA", status: lineToken ? "✅ เชื่อมแล้ว" : "⏭ ข้ามไป", ok: !!lineToken },
                  { icon: "📘", label: "Facebook/Instagram", status: fbToken ? "✅ เชื่อมแล้ว" : "⏭ ข้ามไป", ok: !!fbToken },
                ].map(({ icon, label, status, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="text-sm theme-text-secondary">{label}</span>
                    </div>
                    <span className={`text-xs font-medium ${ok ? "text-green-400" : "theme-text-muted"}`}>{status}</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-950/50 border border-indigo-800/50 rounded-2xl p-4 text-sm text-indigo-200">
                <p>ตั้งค่าเพิ่มเติมได้ที่ <strong>Settings</strong> ตลอดเวลา</p>
                <p className="text-indigo-400 text-xs mt-1">Webhook URL: <span className="font-mono">https://your-domain.com/webhook</span></p>
              </div>

              <button
                onClick={finish}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl font-bold text-white text-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "เข้าสู่ Dashboard →"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

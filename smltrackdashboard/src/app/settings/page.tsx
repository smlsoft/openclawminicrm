"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DemoBanner, DemoGuard } from "@/components/DemoBanner";

interface AccountData {
  email: string;
  name: string;
  image?: string;
  mongodbUri: string;
  mongodbUriConfigured: boolean;
  aiKeys: {
    openrouterKey: string;
    groqKey: string;
    sambaNovaKey: string;
    cerebrasKey: string;
    googleKey: string;
    openrouterKeyConfigured: boolean;
    groqKeyConfigured: boolean;
    sambaNovaKeyConfigured: boolean;
    cerebrasKeyConfigured: boolean;
    googleKeyConfigured: boolean;
  };
  lineConfig: {
    channelAccessToken: string;
    channelSecret: string;
    configured: boolean;
  };
  fbConfig: {
    pageAccessToken: string;
    appSecret: string;
    verifyToken: string;
    configured: boolean;
  };
  telegramChatId: string | null;
}

interface TestResult {
  ok: boolean;
  error?: string;
  collections?: string[];
  documentCount?: number;
  botName?: string;
  botId?: string;
  pictureUrl?: string;
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b theme-border mb-5">
      <div className="w-10 h-10 theme-bg-card rounded-xl flex items-center justify-center text-xl">{icon}</div>
      <div>
        <h2 className="font-semibold theme-text">{title}</h2>
        {subtitle && <p className="text-xs theme-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function MaskedField({
  label,
  maskedValue,
  placeholder,
  onSave,
  saving,
  mono = true,
  hint,
}: {
  label: string;
  maskedValue: string;
  placeholder: string;
  onSave: (val: string) => Promise<void>;
  saving?: boolean;
  mono?: boolean;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [localSaving, setLocalSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setLocalSaving(true);
    await onSave(value.trim());
    setLocalSaving(false);
    setEditing(false);
    setValue("");
  };

  return (
    <div>
      <label className="text-xs theme-text-secondary mb-1.5 block">{label}</label>
      {editing ? (
        <div className="flex gap-2">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className={`flex-1 px-4 py-2.5 theme-input border border-indigo-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${mono ? "font-mono" : ""}`}
            autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setValue(""); } }}
          />
          <button
            onClick={handleSave}
            disabled={!value.trim() || localSaving || saving}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition"
          >
            {localSaving ? "..." : "บันทึก"}
          </button>
          <button
            onClick={() => { setEditing(false); setValue(""); }}
            className="px-4 py-2.5 theme-bg-card hover:theme-bg-hover rounded-xl text-sm transition"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className={`flex-1 px-4 py-2.5 theme-bg-card border theme-border rounded-xl theme-text-secondary text-sm ${mono ? "font-mono" : ""} truncate`}>
            {maskedValue || <span className="theme-text-muted italic">{placeholder}</span>}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2.5 theme-bg-card hover:theme-bg-hover border theme-border rounded-xl text-xs theme-text-secondary hover:theme-text transition"
          >
            แก้ไข
          </button>
        </div>
      )}
      {hint && <p className="text-xs theme-text-muted mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalSaving, setGlobalSaving] = useState(false);

  // MongoDB test
  const [newMongoUri, setNewMongoUri] = useState("");
  const [mongoEditing, setMongoEditing] = useState(false);
  const [mongoTest, setMongoTest] = useState<TestResult | null>(null);
  const [mongoTesting, setMongoTesting] = useState(false);

  // LINE test
  const [lineTest, setLineTest] = useState<TestResult | null>(null);
  const [lineTesting, setLineTesting] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/account");
      if (res.ok) setAccount(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const saveField = async (fields: Record<string, unknown>) => {
    setGlobalSaving(true);
    try {
      await fetch("/dashboard/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      await fetchAccount();
    } catch {}
    setGlobalSaving(false);
  };

  const testMongo = async () => {
    if (!newMongoUri.trim()) return;
    setMongoTesting(true);
    setMongoTest(null);
    try {
      const res = await fetch("/dashboard/api/account/test-mongodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: newMongoUri }),
      });
      setMongoTest(await res.json());
    } catch {
      setMongoTest({ ok: false, error: "เชื่อมต่อไม่ได้" });
    }
    setMongoTesting(false);
  };

  const saveMongoUri = async () => {
    if (!newMongoUri.trim()) return;
    await saveField({ mongodbUri: newMongoUri });
    setMongoEditing(false);
    setNewMongoUri("");
    setMongoTest(null);
  };

  const testLine = async () => {
    if (!account?.lineConfig?.channelAccessToken) return;
    setLineTesting(true);
    setLineTest(null);
    // ไม่สามารถส่ง masked value ไปทดสอบได้ → แจ้ง user
    setLineTest({ ok: false, error: "ไม่สามารถทดสอบ masked token ได้ กรุณาแก้ไข token ใหม่ก่อน" });
    setLineTesting(false);
  };

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
          <Link href="/dashboard" className="theme-text-secondary hover:theme-text transition text-sm">&larr; แดชบอร์ด</Link>
          <div className="w-px h-5 theme-border" />
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center text-sm">⚙️</div>
          <h1 className="text-lg font-bold">ตั้งค่า</h1>
          {globalSaving && <span className="ml-auto text-xs theme-text-muted animate-pulse">กำลังบันทึก...</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">

        {/* ข้อมูลบัญชี */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <SectionHeader icon="👤" title="ข้อมูลบัญชี" subtitle="ข้อมูลจาก Google Account" />
          <div className="flex items-center gap-4">
            {account?.image ? (
              <img src={account.image} alt={account.name} className="w-14 h-14 rounded-full border-2 theme-border" />
            ) : (
              <div className="w-14 h-14 theme-bg-card rounded-full flex items-center justify-center text-2xl border-2 theme-border">👤</div>
            )}
            <div>
              <p className="font-semibold text-lg">{account?.name || "—"}</p>
              <p className="text-sm theme-text-secondary">{account?.email || "—"}</p>
            </div>
          </div>
          <p className="text-xs theme-text-muted mt-4">เปลี่ยนชื่อหรือรูปได้ที่ Google Account ของคุณ</p>
        </section>

        {/* MongoDB */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <SectionHeader icon="🍃" title="ฐานข้อมูล MongoDB" subtitle="เชื่อมต่อ MongoDB Atlas M0 ฟรี — ของคุณเอง" />

          <div className="space-y-4">
            {/* Current URI */}
            <div>
              <label className="text-xs theme-text-secondary mb-1.5 block">Connection URI ปัจจุบัน</label>
              <div className="flex items-center gap-2">
                <div className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono truncate ${
                  account?.mongodbUriConfigured
                    ? "bg-green-950/30 border-green-800/50 text-green-300"
                    : "theme-bg-card theme-border theme-text-muted italic"
                }`}>
                  {account?.mongodbUriConfigured ? account.mongodbUri : "ยังไม่ได้ตั้งค่า"}
                </div>
                <button
                  onClick={() => { setMongoEditing(!mongoEditing); setMongoTest(null); }}
                  className="px-4 py-2.5 theme-bg-card hover:theme-bg-hover border theme-border rounded-xl text-xs theme-text-secondary hover:theme-text transition"
                >
                  {mongoEditing ? "ยกเลิก" : "เปลี่ยน"}
                </button>
              </div>
            </div>

            {/* Edit form */}
            {mongoEditing && (
              <div className="space-y-3 p-4 theme-bg-card rounded-xl border theme-border">
                <div>
                  <label className="text-xs theme-text-secondary mb-1 block">URI ใหม่</label>
                  <input
                    type="text"
                    value={newMongoUri}
                    onChange={(e) => { setNewMongoUri(e.target.value); setMongoTest(null); }}
                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                    className="w-full px-4 py-2.5 theme-input border theme-border rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition font-mono"
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={testMongo}
                    disabled={mongoTesting || !newMongoUri.trim()}
                    className="px-4 py-2.5 bg-green-800 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-600 rounded-xl text-sm font-medium transition"
                  >
                    {mongoTesting ? "กำลังทดสอบ..." : "🔌 ทดสอบ"}
                  </button>
                  <button
                    onClick={saveMongoUri}
                    disabled={!newMongoUri.trim() || globalSaving}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-600 rounded-xl text-sm font-medium transition"
                  >
                    บันทึก
                  </button>
                </div>
                {mongoTest && (
                  <div className={`p-3 rounded-xl border text-xs ${mongoTest.ok ? "bg-green-950/50 border-green-800" : "bg-red-950/50 border-red-800"}`}>
                    {mongoTest.ok ? (
                      <div className="space-y-1">
                        <p className="text-green-400 font-medium">✅ เชื่อมต่อสำเร็จ — {mongoTest.documentCount ?? 0} เอกสาร, {mongoTest.collections?.length ?? 0} collections</p>
                        {mongoTest.collections && mongoTest.collections.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mongoTest.collections.slice(0, 6).map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded font-mono">{c}</span>
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
            )}
          </div>
        </section>

        {/* AI API Keys */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <SectionHeader icon="🤖" title="คีย์ AI API" subtitle="ใช้ key ของคุณเอง — ฟรีทั้งหมด" />
          <div className="space-y-4">
            {[
              {
                label: "OpenRouter API Key",
                field: "openrouterKey" as const,
                placeholder: "sk-or-v1-...",
                configured: account?.aiKeys?.openrouterKeyConfigured,
                masked: account?.aiKeys?.openrouterKey || "",
                required: true,
                link: "https://openrouter.ai/keys",
              },
              {
                label: "Groq API Key",
                field: "groqKey" as const,
                placeholder: "gsk_...",
                configured: account?.aiKeys?.groqKeyConfigured,
                masked: account?.aiKeys?.groqKey || "",
                required: false,
                link: "https://console.groq.com/keys",
              },
              {
                label: "SambaNova API Key",
                field: "sambaNovaKey" as const,
                placeholder: "SambaNova key...",
                configured: account?.aiKeys?.sambaNovaKeyConfigured,
                masked: account?.aiKeys?.sambaNovaKey || "",
                required: false,
                link: "https://cloud.sambanova.ai/",
              },
              {
                label: "Cerebras API Key",
                field: "cerebrasKey" as const,
                placeholder: "csk-...",
                configured: account?.aiKeys?.cerebrasKeyConfigured,
                masked: account?.aiKeys?.cerebrasKey || "",
                required: false,
                link: "https://cloud.cerebras.ai/",
              },
              {
                label: "Google API Key",
                field: "googleKey" as const,
                placeholder: "AIza...",
                configured: account?.aiKeys?.googleKeyConfigured,
                masked: account?.aiKeys?.googleKey || "",
                required: false,
                link: "https://aistudio.google.com/apikey",
              },
            ].map(({ label, field, placeholder, configured, masked, required, link }) => (
              <div key={field}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs theme-text-secondary">{label}</span>
                    {required && <span className="text-xs bg-red-900/40 text-red-400 border border-red-800/40 px-1 py-0.5 rounded">จำเป็น</span>}
                    {configured && <span className="text-xs text-green-400">✅</span>}
                  </div>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-400 transition">สมัครฟรี →</a>
                </div>
                <MaskedField
                  label=""
                  maskedValue={masked}
                  placeholder={placeholder}
                  onSave={async (val) => { await saveField({ aiKeys: { [field]: val } }); }}
                  saving={globalSaving}
                />
              </div>
            ))}
          </div>
        </section>

        {/* LINE OA */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <SectionHeader icon="💬" title="LINE Official Account" subtitle="ตั้งค่าจาก LINE Developers Console" />
          <div className="space-y-4">
            <MaskedField
              label="Channel Access Token (โทเค็นการเข้าถึง)"
              maskedValue={account?.lineConfig?.channelAccessToken || ""}
              placeholder="Channel Access Token"
              onSave={async (val) => { await saveField({ lineConfig: { channelAccessToken: val } }); }}
              saving={globalSaving}
            />
            <MaskedField
              label="Channel Secret (รหัสลับช่องทาง)"
              maskedValue={account?.lineConfig?.channelSecret || ""}
              placeholder="Channel Secret"
              onSave={async (val) => { await saveField({ lineConfig: { channelSecret: val } }); }}
              saving={globalSaving}
            />

            {/* Status + test */}
            <div className="flex items-center justify-between pt-2 border-t theme-border">
              <div className="flex items-center gap-2">
                {account?.lineConfig?.configured ? (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                    ตั้งค่าแล้ว
                  </span>
                ) : (
                  <span className="text-xs theme-text-muted flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-600 rounded-full inline-block" />
                    ยังไม่ได้ตั้งค่า
                  </span>
                )}
              </div>
              {account?.lineConfig?.configured && (
                <button
                  onClick={testLine}
                  disabled={lineTesting}
                  className="px-3 py-1.5 bg-green-900/50 hover:bg-green-800/50 border border-green-800/50 rounded-lg text-xs text-green-400 hover:text-white transition"
                >
                  {lineTesting ? "กำลังทดสอบ..." : "ทดสอบ LINE"}
                </button>
              )}
            </div>
            {lineTest && (
              <div className={`p-3 rounded-xl border text-xs ${lineTest.ok ? "bg-green-950/50 border-green-800" : "bg-amber-950/50 border-amber-800"}`}>
                {lineTest.ok ? (
                  <p className="text-green-400">✅ {lineTest.botName}</p>
                ) : (
                  <p className="text-amber-400">⚠️ {lineTest.error}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Facebook / Instagram */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <SectionHeader icon="📘" title="Facebook / Instagram" subtitle="ตั้งค่าจาก Meta Business Suite" />
          <div className="space-y-4">
            <MaskedField
              label="Page Access Token (โทเค็นเพจ)"
              maskedValue={account?.fbConfig?.pageAccessToken || ""}
              placeholder="EAAxxxxxxxx..."
              onSave={async (val) => { await saveField({ fbConfig: { pageAccessToken: val } }); }}
              saving={globalSaving}
            />
            <MaskedField
              label="App Secret (รหัสลับแอป)"
              maskedValue={account?.fbConfig?.appSecret || ""}
              placeholder="App Secret"
              onSave={async (val) => { await saveField({ fbConfig: { appSecret: val } }); }}
              saving={globalSaving}
            />
            <MaskedField
              label="Verify Token (โทเค็นยืนยัน)"
              maskedValue={account?.fbConfig?.verifyToken || ""}
              placeholder="ตั้งเองได้เลย เช่น my-verify-token"
              onSave={async (val) => { await saveField({ fbConfig: { verifyToken: val } }); }}
              saving={globalSaving}
              mono={false}
            />
            <div className="flex items-center gap-2 pt-2 border-t theme-border">
              {account?.fbConfig?.configured ? (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                  Facebook ตั้งค่าแล้ว — Instagram ใช้ token เดียวกัน
                </span>
              ) : (
                <span className="text-xs theme-text-muted">ยังไม่ได้ตั้งค่า</span>
              )}
            </div>
          </div>
        </section>

        {/* Telegram */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <SectionHeader icon="✈️" title="Telegram — น้องกุ้ง" subtitle="รับคำแนะนำจาก AI ผ่าน Telegram" />
          <div className="flex items-center justify-between">
            <div>
              {account?.telegramChatId ? (
                <div>
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                    เชื่อมต่อแล้ว
                  </p>
                  <p className="text-xs theme-text-muted mt-1 font-mono">Chat ID: {account.telegramChatId}</p>
                </div>
              ) : (
                <p className="text-sm theme-text-muted">ยังไม่ได้เชื่อมต่อ</p>
              )}
            </div>
            {!account?.telegramChatId && (
              <a
                href="https://t.me/SMLClawBot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-800/50 rounded-xl text-xs text-blue-400 hover:text-white transition"
              >
                เชื่อมต่อ →
              </a>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="theme-bg-secondary border border-red-900/40 rounded-2xl p-6">
          <SectionHeader icon="⚠️" title="โซนอันตราย" subtitle="การกระทำที่ย้อนกลับไม่ได้" />
          <div className="space-y-3">
            <p className="text-sm theme-text-secondary">
              ลบบัญชีนี้จะลบข้อมูลการตั้งค่าทั้งหมด (ข้อมูลใน MongoDB ของคุณจะไม่ถูกลบ)
            </p>
            <div>
              <label className="text-xs theme-text-secondary mb-1 block">
                พิมพ์ <span className="font-mono text-red-400">{account?.email}</span> เพื่อยืนยัน
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(""); }}
                placeholder={account?.email || ""}
                className="w-full px-4 py-2.5 theme-input border theme-border rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
              {deleteError && <p className="text-red-400 text-xs mt-1">{deleteError}</p>}
            </div>
            <button
              onClick={() => {
                if (deleteConfirm !== account?.email) {
                  setDeleteError("อีเมลไม่ตรงกัน");
                  return;
                }
                alert("ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้");
              }}
              disabled={deleteConfirm !== account?.email}
              className="px-5 py-2.5 bg-red-950 hover:bg-red-900 disabled:bg-gray-800 disabled:text-gray-600 border border-red-800/50 disabled:border-gray-700 rounded-xl text-sm text-red-400 hover:text-red-300 disabled:cursor-not-allowed transition"
            >
              ลบบัญชี
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}

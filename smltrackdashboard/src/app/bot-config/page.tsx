"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface BotConfig {
  sourceId: string;
  botName: string;
  systemPrompt: string;
  aiReplyMode: "off" | "auto" | "mention" | "keyword";
  aiReplyKeywords: string[];
  model: string;
  sourceType: string;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

const REPLY_MODES = [
  { value: "off", label: "ปิด", desc: "ฟังอย่างเดียว", icon: "⚫" },
  { value: "auto", label: "อัตโนมัติ", desc: "ตอบทุกข้อความ", icon: "🟢" },
  { value: "mention", label: "เรียกชื่อ", desc: "ตอบเมื่อเรียกชื่อ Bot", icon: "🔵" },
  { value: "keyword", label: "คำสำคัญ", desc: "ตอบเมื่อมีคำที่กำหนด", icon: "🟡" },
] as const;

function getPlatform(sourceId: string) {
  if (sourceId.startsWith("fb_")) return { name: "Facebook", icon: "💙", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
  if (sourceId.startsWith("ig_")) return { name: "Instagram", icon: "💜", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" };
  return { name: "LINE", icon: "💚", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" };
}

function getModeInfo(mode: string) {
  return REPLY_MODES.find((m) => m.value === mode) || REPLY_MODES[0];
}

export default function BotConfigPage() {
  const [configs, setConfigs] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [formBotName, setFormBotName] = useState("");
  const [formMode, setFormMode] = useState<string>("off");
  const [formKeywords, setFormKeywords] = useState("");
  const [formPrompt, setFormPrompt] = useState("");

  const fetchConfigs = useCallback(async () => {
    try {
      const r = await fetch("/dashboard/api/bot-config");
      const d = await r.json();
      if (Array.isArray(d)) setConfigs(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const openEdit = (cfg: BotConfig) => {
    setEditing(cfg);
    setFormBotName(cfg.botName || "");
    setFormMode(cfg.aiReplyMode || "off");
    setFormKeywords((cfg.aiReplyKeywords || []).join(", "));
    setFormPrompt(cfg.systemPrompt || "");
    setSaveMsg("");
  };

  const closeEdit = () => {
    setEditing(null);
    setSaveMsg("");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body = {
        botName: formBotName,
        aiReplyMode: formMode,
        aiReplyKeywords: formKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        systemPrompt: formPrompt,
      };
      const r = await fetch(`/dashboard/api/bot-config/${encodeURIComponent(editing.sourceId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setSaveMsg("บันทึกสำเร็จ");
        await fetchConfigs();
        setTimeout(() => closeEdit(), 800);
      } else {
        setSaveMsg("บันทึกไม่สำเร็จ");
      }
    } catch {
      setSaveMsg("เชื่อมต่อไม่ได้");
    }
    setSaving(false);
  };

  const filtered = configs.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.sourceId || "").toLowerCase().includes(q) ||
      (c.groupName || "").toLowerCase().includes(q) ||
      (c.botName || "").toLowerCase().includes(q)
    );
  });

  if (loading)
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="theme-text-muted animate-pulse text-sm">กำลังโหลด...</div>
      </div>
    );

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 pb-24 md:pb-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="theme-text-muted hover:theme-text text-sm">
            &larr; กลับ
          </Link>
        </div>

        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <span className="text-xl">🤖</span> ตั้งค่า Bot
          </h1>
          <p className="text-sm theme-text-muted mt-1">จัดการน้องกุ้งแต่ละห้อง</p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
          <input
            type="text"
            placeholder="ค้นหาห้อง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border theme-border text-sm theme-text"
            style={{ background: "var(--bg-card)" }}
          />
        </div>

        {/* Config list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 theme-text-muted text-sm">
            {search ? "ไม่พบห้องที่ค้นหา" : "ยังไม่มีการตั้งค่า Bot"}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cfg) => {
              const platform = getPlatform(cfg.sourceId);
              const mode = getModeInfo(cfg.aiReplyMode);
              return (
                <div
                  key={cfg.sourceId}
                  className={`rounded-xl border p-4 ${platform.bg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span>{platform.icon}</span>
                        <span className={platform.color}>{platform.name}</span>
                        <span className="theme-text truncate">
                          {cfg.groupName || cfg.sourceId}
                        </span>
                      </div>
                      <div className="text-sm theme-text-secondary">
                        ชื่อ Bot: <span className="theme-text">{cfg.botName || "-"}</span>
                      </div>
                      <div className="text-sm theme-text-secondary">
                        โหมดตอบ: <span>{mode.icon} {mode.label}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openEdit(cfg)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border theme-border theme-text-secondary hover:theme-text"
                      style={{ background: "var(--bg-card)" }}
                    >
                      แก้ไข
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-2xl border theme-border p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg-card)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold theme-text">
                แก้ไข Bot — {editing.groupName || editing.sourceId}
              </h2>
              <button onClick={closeEdit} className="theme-text-muted hover:theme-text text-lg">
                ✕
              </button>
            </div>

            {/* Bot Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium theme-text">ชื่อ Bot</label>
              <input
                type="text"
                value={formBotName}
                onChange={(e) => setFormBotName(e.target.value)}
                placeholder="น้องกุ้ง"
                className="w-full px-3 py-2 rounded-lg border theme-border text-sm theme-text"
                style={{ background: "var(--bg-primary)" }}
              />
            </div>

            {/* Reply Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium theme-text">โหมดตอบอัตโนมัติ</label>
              <div className="space-y-2">
                {REPLY_MODES.map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formMode === m.value
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "theme-border hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aiReplyMode"
                      value={m.value}
                      checked={formMode === m.value}
                      onChange={() => setFormMode(m.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium theme-text">
                        {m.icon} {m.label}
                      </div>
                      <div className="text-xs theme-text-muted">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Keywords (show only when mode = keyword) */}
            {formMode === "keyword" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium theme-text">คำสำคัญ</label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="ราคา, สั่ง, สนใจ"
                  className="w-full px-3 py-2 rounded-lg border theme-border text-sm theme-text"
                  style={{ background: "var(--bg-primary)" }}
                />
                <p className="text-xs theme-text-muted">คั่นด้วยเครื่องหมาย , (comma)</p>
              </div>
            )}

            {/* System Prompt */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium theme-text">คำสั่งบอท (บุคลิกและบทบาท)</label>
              <textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="คุณเป็นผู้ช่วยร้านขายเครื่องกรองน้ำ..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg border theme-border text-sm theme-text resize-y"
                style={{ background: "var(--bg-primary)" }}
              />
            </div>

            {/* Save message */}
            {saveMsg && (
              <div
                className={`text-sm text-center py-1 ${
                  saveMsg === "บันทึกสำเร็จ" ? "text-green-400" : "text-red-400"
                }`}
              >
                {saveMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
              <button
                onClick={closeEdit}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border theme-border theme-text-secondary hover:theme-text transition-colors"
                style={{ background: "var(--bg-primary)" }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface TeamMember {
  _id: string;
  userId: string;
  email: string;
  name: string;
  image?: string;
  role: "admin" | "responder" | "reviewer" | "viewer";
  addedAt: string;
  isCurrentUser?: boolean;
}

const ROLES: Record<string, { label: string; color: string; desc: string }> = {
  admin:     { label: "ผู้ดูแล",     color: "text-red-400 bg-red-900/30 border-red-800/50",     desc: "จัดการทุกอย่างได้" },
  responder: { label: "ผู้ตอบ", color: "text-blue-400 bg-blue-900/30 border-blue-800/50", desc: "ตอบแชทได้" },
  reviewer:  { label: "ผู้ตรวจ",  color: "text-amber-400 bg-amber-900/30 border-amber-800/50", desc: "ดูและตรวจสอบเท่านั้น" },
  viewer:    { label: "ผู้ดู",    color: "text-gray-400 bg-gray-800 border-gray-700",        desc: "ดูข้อมูลได้อย่างเดียว" },
};

function RoleBadge({ role }: { role: string }) {
  const r = ROLES[role] || ROLES.viewer;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${r.color}`}>
      {r.label}
    </span>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const currentEmail = session?.user?.email || "";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"responder" | "reviewer" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/dashboard/api/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(
          (data.members || []).map((m: TeamMember) => ({
            ...m,
            isCurrentUser: m.email === currentEmail,
          }))
        );
      }
    } catch {}
    setLoading(false);
  }, [currentEmail]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetch("/dashboard/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      setInviteResult({ ok: res.ok, message: data.message || (res.ok ? "ส่งคำเชิญแล้ว" : "เกิดข้อผิดพลาด") });
      if (res.ok) {
        setInviteEmail("");
        fetchMembers();
      }
    } catch {
      setInviteResult({ ok: false, message: "เชื่อมต่อไม่ได้" });
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleChanging(userId);
    try {
      await fetch("/dashboard/api/team/member", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      await fetchMembers();
    } catch {}
    setRoleChanging(null);
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await fetch("/dashboard/api/team/member", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      await fetchMembers();
    } catch {}
    setRemoving(null);
    setConfirmRemove(null);
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
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center text-sm">👥</div>
          <h1 className="text-lg font-bold">ทีม</h1>
          <span className="ml-2 text-xs theme-bg-card theme-text-secondary px-2 py-0.5 rounded-full border theme-border">
            {members.length} คน
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 md:p-6 pb-24 md:pb-6 space-y-6">

        {/* Invite */}
        <section className="theme-bg-secondary border theme-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b theme-border">
            <div className="w-10 h-10 bg-indigo-900/40 rounded-xl flex items-center justify-center text-xl">✉️</div>
            <div>
              <h2 className="font-semibold">เชิญสมาชิก</h2>
              <p className="text-xs theme-text-muted">เชิญทีมงานด้วยอีเมล</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteResult(null); }}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1 px-4 py-2.5 theme-input border text-sm rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "responder" | "reviewer" | "viewer")}
                className="px-3 py-2.5 theme-input border text-sm rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="viewer">ผู้ดู</option>
                <option value="reviewer">ผู้ตรวจ</option>
                <option value="responder">ผู้ตอบ</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium transition"
              >
                {inviting ? "กำลังส่ง..." : "เชิญ"}
              </button>
            </div>

            {/* Role descriptions */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLES).filter(([k]) => k !== "admin").map(([key, r]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <RoleBadge role={key} />
                  <span className="text-xs theme-text-muted">= {r.desc}</span>
                </div>
              ))}
            </div>

            {inviteResult && (
              <div className={`p-3 rounded-xl border text-sm ${inviteResult.ok ? "bg-green-950/50 border-green-800 text-green-400" : "bg-red-950/50 border-red-800 text-red-400"}`}>
                {inviteResult.ok ? "✅" : "❌"} {inviteResult.message}
              </div>
            )}
          </div>
        </section>

        {/* Members list */}
        <section className="theme-bg-secondary border theme-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b theme-border flex items-center gap-3">
            <div className="w-10 h-10 theme-bg-card rounded-xl flex items-center justify-center text-xl">👥</div>
            <div>
              <h2 className="font-semibold">สมาชิกทีม</h2>
              <p className="text-xs theme-text-muted">{members.length} คน</p>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="p-8 text-center">
              <p className="theme-text-muted text-sm">ยังไม่มีสมาชิก</p>
              <p className="theme-text-muted text-xs mt-1">เชิญสมาชิกด้วยแบบฟอร์มด้านบน</p>
            </div>
          ) : (
            <div className="theme-divide divide-y">
              {members.map((member) => (
                <div key={member._id} className="px-6 py-4 flex items-center gap-4">
                  {/* Avatar */}
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-10 h-10 rounded-full border theme-border shrink-0" />
                  ) : (
                    <div className="w-10 h-10 theme-bg-card rounded-full flex items-center justify-center text-lg border theme-border shrink-0">
                      👤
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium theme-text truncate">{member.name || member.email}</p>
                      {member.isCurrentUser && (
                        <span className="text-xs text-indigo-400 bg-indigo-900/30 border border-indigo-800/50 px-1.5 py-0.5 rounded-full">คุณ</span>
                      )}
                    </div>
                    <p className="text-xs theme-text-muted truncate">{member.email}</p>
                    <p className="text-xs theme-text-muted mt-0.5">
                      เข้าร่วม {new Date(member.addedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Role selector */}
                  {!member.isCurrentUser ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {confirmRemove === member.userId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs theme-text-secondary">ยืนยันลบ?</span>
                          <button
                            onClick={() => handleRemove(member.userId)}
                            disabled={removing === member.userId}
                            className="px-3 py-1.5 bg-red-900 hover:bg-red-800 border border-red-700 rounded-lg text-xs text-red-300 hover:text-white transition"
                          >
                            {removing === member.userId ? "..." : "ลบ"}
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            className="px-3 py-1.5 theme-bg-card hover:theme-bg-hover rounded-lg text-xs theme-text-secondary transition"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                            disabled={roleChanging === member.userId}
                            className="px-3 py-1.5 theme-input border text-xs rounded-lg focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                          >
                            {Object.entries(ROLES).map(([key, r]) => (
                              <option key={key} value={key}>{r.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setConfirmRemove(member.userId)}
                            className="w-8 h-8 flex items-center justify-center theme-bg-card hover:bg-red-950 border theme-border hover:border-red-800 rounded-lg theme-text-muted hover:text-red-400 transition text-sm"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { timeAgo, formatDate } from "@/lib/utils";
import { UserPlus, Trash2 } from "lucide-react";
import { inviteStaffAction, removeStaffAction, updateStaffRoleAction } from "./actions";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "platform_staff";
  addedAt: string;
  lastActiveAt: string;
};

export function StaffClient({ staff, isSuperAdmin }: { staff: StaffRow[]; isSuperAdmin: boolean }) {
  const [rows, setRows] = useState(staff);
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "platform_staff">("platform_staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await inviteStaffAction({ name, email, role });
        setInviting(false);
        setName("");
        setEmail("");
        setRole("platform_staff");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to invite staff member");
      }
    });
  }

  function changeRole(id: string, nextRole: "super_admin" | "platform_staff") {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    startTransition(async () => {
      await updateStaffRoleAction(id, target.name, nextRole);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role: nextRole } : r)));
    });
  }

  function remove(id: string) {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    startTransition(async () => {
      await removeStaffAction(id, target.name);
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div>
      <PageHeader
        title="Platform staff"
        description="Who has access to this super-admin console — separate from any vendor's own admin accounts."
        action={
          isSuperAdmin && (
            <Button variant="primary" onClick={() => setInviting((v) => !v)}>
              <UserPlus size={16} /> Invite staff
            </Button>
          )
        }
      />

      {inviting && (
        <Card className="mb-4">
          <form onSubmit={submitInvite} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputClass}>
                <option value="platform_staff">Platform Staff</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            {error && <p className="text-xs text-[var(--danger)] sm:col-span-3">{error}</p>}
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Sending…" : "Send invite"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setInviting(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="divide-y divide-[var(--border)]">
          {rows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-black"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{s.name}</p>
                  <p className="text-xs text-[var(--text-faint)]">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[var(--text-faint)]">Joined {formatDate(s.addedAt)}</span>
                <span className="text-xs text-[var(--text-faint)]">Active {timeAgo(s.lastActiveAt)}</span>
                {isSuperAdmin ? (
                  <select
                    value={s.role}
                    onChange={(e) => changeRole(s.id, e.target.value as StaffRow["role"])}
                    disabled={pending}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] outline-none"
                  >
                    <option value="platform_staff">Platform Staff</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                ) : (
                  <Badge tone={s.role === "super_admin" ? "violet" : "neutral"}>
                    {s.role === "super_admin" ? "Super Admin" : "Platform Staff"}
                  </Badge>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                    aria-label={`Remove ${s.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-faint)]">No staff yet.</p>}
        </div>
      </Card>
    </div>
  );
}

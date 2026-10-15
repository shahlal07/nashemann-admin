"use client";

import { useEffect, useState } from "react";
import { Mail, KeyRound, Users, AlertCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { updatePlatformAccountCredentialsAction } from "./actions";

type PlatformAccount = {
  id: string;
  name: string;
  email: string;
  provider: string;
  created_at: string;
};

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";

export default function VendorAccountsPage() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("platform_accounts")
      .select("id, name, email, provider, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (queryError) setError("Couldn't load platform accounts. Please refresh or check your access.");
        setAccounts((data as PlatformAccount[]) ?? []);
        setLoading(false);
      });
  }, []);

  function startEdit(account: PlatformAccount) {
    setEditingId(account.id);
    setEditName(account.name);
    setEditEmail(account.email);
    setEditPassword("");
    setError(null);
    setSavedId(null);
  }

  async function saveCredentials(account: PlatformAccount) {
    setBusyId(account.id);
    setError(null);
    const result = await updatePlatformAccountCredentialsAction({
      accountId: account.id,
      name: editName,
      email: editEmail,
      password: editPassword,
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAccounts((previous) =>
      previous.map((item) =>
        item.id === account.id ? { ...item, name: editName.trim(), email: editEmail.trim().toLowerCase() } : item
      )
    );
    setEditingId(null);
    setEditPassword("");
    setSavedId(account.id);
  }

  return (
    <div>
      <PageHeader
        title="Vendor accounts"
        description="Platform accounts vendors use for tracking applications, support chat, and bug reports — separate from any store's own admin login."
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <p className="mb-4 text-xs text-[var(--text-faint)]">
        Super Admin can change the sign-in email and set a new password directly. Leave the password blank to keep the existing password. Changes are applied to Supabase Auth immediately; no reset email is required.
      </p>

      <Card>
        {!loading && accounts.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-faint)]">
            <Users size={15} /> No platform accounts yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text)]">
                    {account.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === account.id ? (
                      <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                        <label className="text-xs text-[var(--text-muted)]">Display name
                          <input value={editName} onChange={(event) => setEditName(event.target.value)} className={inputClass} autoComplete="name" />
                        </label>
                        <label className="text-xs text-[var(--text-muted)]">Sign-in email
                          <input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className={inputClass} autoComplete="email" />
                        </label>
                        <label className="text-xs text-[var(--text-muted)] sm:col-span-2">New password (optional)
                          <input type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} className={inputClass} minLength={8} autoComplete="new-password" placeholder="Leave blank to keep current password" />
                        </label>
                        <p className="text-xs text-[var(--text-faint)] sm:col-span-2">Use at least 8 characters. The new password is never displayed again after saving.</p>
                        <div className="flex gap-2 sm:col-span-2">
                          <Button size="sm" variant="primary" onClick={() => saveCredentials(account)} disabled={busyId === account.id}>
                            {busyId === account.id ? "Saving…" : "Save credentials"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} disabled={busyId === account.id}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--text)]">
                          {account.name}
                          {account.provider === "google" && <ShieldCheck size={12} className="text-[var(--text-faint)]" />}
                        </p>
                        <p className="break-all text-xs text-[var(--text-faint)]">{account.email}</p>
                        {savedId === account.id && <p className="mt-1 text-xs font-medium text-[var(--success)]">Credentials updated successfully.</p>}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone="neutral">Joined {formatDate(account.created_at)}</Badge>
                  {editingId !== account.id && (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(account)}>
                      <KeyRound size={12} /> Edit credentials
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

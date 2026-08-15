"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, KeyRound, Globe, Users, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

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
  const [newEmail, setNewEmail] = useState("");
  const [resetSentId, setResetSentId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("platform_accounts")
      .select("id, name, email, provider, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAccounts((data as PlatformAccount[]) ?? []);
        setLoading(false);
      });
  }, []);

  function startEdit(a: PlatformAccount) {
    setEditingId(a.id);
    setNewEmail(a.email);
    setError(null);
  }

  async function saveEmail(id: string) {
    setBusyId(id);
    setError(null);
    const supabase = createClient();
    const { data, error: invokeError } = await supabase.functions.invoke("update-account-email", {
      body: { accountId: id, newEmail },
    });

    setBusyId(null);
    if (invokeError || !data) {
      const message =
        "context" in invokeError && invokeError.context instanceof Response
          ? ((await invokeError.context.json().catch(() => null)) as { error?: string } | null)?.error
          : undefined;
      setError(`Couldn't update email: ${message ?? invokeError?.message ?? "unknown error"}`);
      return;
    }
    setAccounts((prev) => prev.map((a) => (a.id === id ? (data as PlatformAccount) : a)));
    setEditingId(null);
  }

  async function sendReset(account: PlatformAccount) {
    setBusyId(account.id);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(account.email);
    setBusyId(null);
    if (resetError) {
      setError(`Couldn't send reset email: ${resetError.message}`);
      return;
    }
    setResetSentId(account.id);
    setTimeout(() => setResetSentId(null), 2500);
  }

  return (
    <div>
      <PageHeader
        title="Vendor accounts"
        description="Platform accounts vendors use for tracking applications, support chat, and bug reports — separate from any store's own admin login."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <p className="mb-4 text-xs text-[var(--text-faint)]">
        Editing the email here changes the account&apos;s sign-in credential via Supabase Auth and keeps
        Nashemann&apos;s support record in sync. &quot;Send reset&quot; sends a real password-reset email via Supabase
        Auth.
      </p>

      <Card>
        {!loading && accounts.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-faint)]">
            <Users size={15} /> No platform accounts yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text)]">
                    {a.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--text)]">
                      {a.name}
                      {a.provider === "google" && <Globe size={12} className="text-[var(--text-faint)]" />}
                    </p>
                    {editingId === a.id ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`${inputClass} w-56 py-1.5 text-xs`} />
                        <Button size="sm" variant="primary" onClick={() => saveEmail(a.id)} disabled={busyId === a.id}>
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-faint)]">{a.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone="neutral">Joined {formatDate(a.created_at)}</Badge>
                  {editingId !== a.id && (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(a)}>
                      <Mail size={12} /> Change email
                    </Button>
                  )}
                  {resetSentId === a.id ? (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-[var(--success)]">
                      Reset link sent
                    </motion.span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => sendReset(a)} disabled={busyId === a.id}>
                      <KeyRound size={12} /> Send reset
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

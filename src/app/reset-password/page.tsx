"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

/**
 * Landing page for a Supabase recovery link (staff invite, or a
 * self-service "forgot password" reset from /accounts). The link's
 * `redirect_to` points here with the recovery session in the URL fragment --
 * `createBrowserClient` picks that fragment up on construction and fires a
 * PASSWORD_RECOVERY auth event once the session is usable, which is what
 * this page waits for before allowing a password to be set.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="glass-panel rounded-[var(--radius-lg)] p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h1 className="font-display text-lg font-semibold text-[var(--text)]">Set your password</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Choose a password to finish signing in to Nashemann Admin.</p>

          {done ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-[var(--success)]">
              <CheckCircle2 size={15} /> Password set — redirecting…
            </p>
          ) : !ready ? (
            <p className="mt-6 text-sm text-[var(--text-muted)]">Verifying your invite link…</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className={labelClass}>New password</span>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>
              <label className="block">
                <span className={labelClass}>Confirm password</span>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-[var(--danger)]">
                  <AlertCircle size={14} /> {error}
                </p>
              )}

              <Button type="submit" variant="primary" disabled={submitting} className="w-full justify-center">
                {submitting ? "Setting password…" : "Set password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

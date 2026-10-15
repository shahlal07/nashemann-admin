"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("owner_memberships")
      .select("user_id, status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (membershipError || !membership || membership.status !== "active") {
      await supabase.auth.signOut();
      setError("This account is not enabled for the founder workspace. Ask Super Admin to provision access.");
      setSubmitting(false);
      return;
    }

    router.replace("/owners");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="glass-panel rounded-[var(--radius-lg)] p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h1 className="font-display text-lg font-semibold text-[var(--text)]">Founder sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Use your personal Nashemann owner account.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className={labelClass}>Email</span>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@nashemann.store" className={inputClass + " pl-9"} />
              </div>
            </label>
            <label className="block">
              <span className={labelClass}>Password</span>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className={inputClass + " pl-9"} />
              </div>
            </label>
            {error && <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs text-[var(--danger)]"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}</div>}
            <Button type="submit" variant="primary" disabled={submitting} className="w-full">{submitting ? "Signing in…" : "Sign in to workspace"}</Button>
          </form>
        </div>
      </div>
    </main>
  );
}

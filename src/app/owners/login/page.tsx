"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)]";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (authError || !authData.user) {
      setError("Unable to sign in with those credentials.");
      setSubmitting(false);
      return;
    }

    // Authentication proves identity only. The separate membership check
    // decides whether this account may enter the owner workspace.
    const { data: membership, error: membershipError } = await supabase
      .from("owner_memberships")
      .select("status")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (membershipError || !membership || membership.status !== "active") {
      // Keep the authenticated session so the access page can explain pending,
      // suspended, or unconfigured membership without granting workspace access.
      router.replace("/owners/access");
      router.refresh();
      return;
    }

    router.replace("/owners");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Nashemann · Owners</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text)]">Owner sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Use your own Nashemann account. Access to each owner domain is checked separately after sign-in.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Email</span>
            <span className="relative block">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@nashemann.store"
                className={inputClass + " pl-10"}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Password</span>
            <span className="relative block">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className={inputClass + " pl-10"}
              />
            </span>
          </label>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm text-[var(--danger)]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--accent-violet)] px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verifying access…" : "Sign in to owner workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Staff sign-in is separate. <Link href="/login" className="font-medium text-[var(--accent-violet-deep)] underline underline-offset-4">Go to staff login</Link>
        </p>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  AlertCircle,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] pl-11 pr-4 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] focus:ring-4 focus:ring-[rgba(139,107,255,0.12)]";
const labelClass = "mb-2 block text-sm font-medium text-[var(--text)]";

export default function OwnerLoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        setError("Those credentials could not be verified. Check your email and password and try again.");
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
        setError("Founder access is not active for this account. Contact your platform administrator.");
        setSubmitting(false);
        return;
      }

      router.replace("/owners");
      router.refresh();
    } catch {
      setError("We couldn't connect securely. Please try again in a moment.");
      setSubmitting(false);
    }
  }

  const enter = reduceMotion ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-[rgba(139,107,255,0.14)] blur-[110px]"
          animate={reduceMotion ? undefined : { x: [0, 22, 0], y: [0, 14, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-56 right-[-8rem] h-[38rem] w-[38rem] rounded-full bg-[rgba(255,176,32,0.09)] blur-[120px]"
          animate={reduceMotion ? undefined : { x: [0, -18, 0], y: [0, -12, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px)", backgroundSize: "52px 52px", maskImage: "linear-gradient(to bottom, black, transparent 82%)" }} />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_minmax(430px,0.82fr)]">
        <motion.section
          {...enter}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden flex-col justify-between px-12 py-10 lg:flex xl:px-20 xl:py-12"
        >
          <div><Logo /></div>

          <div className="relative z-10 max-w-2xl pb-8">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] shadow-[0_0_12px_rgba(52,211,153,.8)]" />
              Private workspace · Authorized founders only
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.08] tracking-[-0.055em] xl:text-6xl">
              Build with clarity.
              <br />
              <span className="accent-text">Lead with intent.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-muted)] xl:text-lg xl:leading-8">
              A considered view of the company—decisions, responsibilities, and the signals that matter—without the operational noise.
            </p>

            <div className="mt-12 grid max-w-xl grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-xl">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(139,107,255,.14)] text-[var(--accent-violet-deep)]"><Fingerprint size={18} /></div>
                <p className="text-sm font-semibold">Identity-first access</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">Every session is tied to your authorized account.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-xl">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(255,176,32,.12)] text-[var(--accent-amber)]"><ShieldCheck size={18} /></div>
                <p className="text-sm font-semibold">Permission-aware</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">Workspace access follows assigned capabilities.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-5 text-xs text-[var(--text-faint)]">
            <span>Nashemann · Co-Founder Workspace</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles size={13} /> Built for focused leadership</span>
          </div>
        </motion.section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:border-l lg:border-[var(--border)] lg:bg-[rgba(255,255,255,0.012)] xl:px-14">
          <motion.div
            {...enter}
            transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-9 flex items-center justify-between lg:hidden"><Logo /><span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">Founder access</span></div>

            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(139,107,255,.25)] bg-[rgba(139,107,255,.11)] text-[var(--accent-violet-deep)] shadow-[0_10px_40px_rgba(139,107,255,.1)]">
                <LockKeyhole size={21} />
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-violet-deep)]">Founder portal</p>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-[2.15rem]">Welcome back.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Sign in to your private workspace to review company priorities and decisions.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className={labelClass}>Work email</span>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input required type="email" autoComplete="username" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@nashemann.store" className={inputClass} />
                </div>
              </label>

              <label className="block">
                <span className={labelClass}>Password</span>
                <div className="relative">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className={inputClass + " pr-12"} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-faint)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-violet)]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <motion.div
                  role="alert"
                  initial={reduceMotion ? false : { opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 rounded-xl border border-[rgba(251,113,133,.28)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm leading-5 text-[var(--danger)]"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />{error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={reduceMotion || submitting ? undefined : { y: -1 }}
                whileTap={reduceMotion || submitting ? undefined : { scale: 0.99 }}
                style={{ background: "var(--accent-gradient)" }}\n                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-[#100d1b] shadow-[0_10px_30px_rgba(139,107,255,.18)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Verifying access…" : "Continue to workspace"}
                {!submitting && <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
              </motion.button>
            </form>

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />
              <p className="text-xs leading-5 text-[var(--text-muted)]">Your account must be provisioned and active. Access is checked against your founder membership before the workspace opens.</p>
            </div>

            <p className="mt-8 text-center text-xs text-[var(--text-faint)]">Protected by Nashemann access controls</p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

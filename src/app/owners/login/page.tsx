import Link from "next/link";
import { AlertCircle, LockKeyhole, UserRound } from "lucide-react";
import { ownerLoginAction } from "./actions";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)]";

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const showError = Boolean(params.error);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Nashemann · Owners</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text)]">Owner sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Use the username and password provisioned for you by Nashemann Super Admin.
        </p>

        <form action={ownerLoginAction} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Username</span>
            <span className="relative block">
              <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                required
                name="username"
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z][a-zA-Z0-9._-]{2,29}"
                placeholder="your.username"
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
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className={inputClass + " pl-10"}
              />
            </span>
          </label>

          {showError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm text-[var(--danger)]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{params.error === "unavailable" ? "Owner sign-in is temporarily unavailable. Please try again later." : "Unable to sign in with those credentials."}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent-violet)] px-4 py-3 text-sm font-semibold text-white transition-opacity"
          >
            Sign in to owner workspace
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Staff sign-in is separate. <Link href="/login" className="font-medium text-[var(--accent-violet-deep)] underline underline-offset-4">Go to staff login</Link>
        </p>
      </section>
    </main>
  );
}

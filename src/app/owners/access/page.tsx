import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function FounderAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Nashemann</p>
          <h1 className="mt-3 text-2xl font-semibold">Founder access</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Sign in with your existing Nashemann account. Founder access is granted separately
            and is not created by signing in.
          </p>
          <Link className="mt-6 inline-flex rounded-xl bg-[var(--accent-violet)] px-4 py-2.5 text-sm font-medium text-white" href="/login">
            Go to sign in
          </Link>
        </section>
      </main>
    );
  }

  let state: "pending" | "active" | "suspended" | "unavailable" = "unavailable";
  const { data, error } = await supabase
    .from("owner_memberships")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!error && data) {
    state = data.status === "active" || data.status === "suspended" ? data.status : "pending";
  }

  const copy = {
    pending: {
      title: "Membership awaiting activation",
      description: "Your founder membership exists but has not been activated. Ask the existing Super Admin to confirm your access and capabilities.",
    },
    active: {
      title: "Open your workspace",
      description: "Your founder membership is active. If you landed here unexpectedly, return to the workspace.",
    },
    suspended: {
      title: "Membership is inactive",
      description: "This founder membership is currently suspended. Contact the existing Super Admin if you believe this is incorrect.",
    },
    unavailable: {
      title: "Founder access is not configured",
      description: "No active founder membership could be verified. The workspace stays locked until the reviewed database migration is applied and your membership is provisioned.",
    },
  }[state];

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Nashemann · Founder workspace</p>
        <h1 className="mt-3 text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{copy.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {state === "active" ? (
            <Link className="inline-flex rounded-xl bg-[var(--accent-violet)] px-4 py-2.5 text-sm font-medium text-white" href="/owners">
              Open workspace
            </Link>
          ) : (
            <Link className="inline-flex rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium" href="/">
              Return to platform
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

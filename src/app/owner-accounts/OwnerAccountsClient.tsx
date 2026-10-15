"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { KeyRound, Plus, ShieldCheck, UserRound, Users } from "lucide-react";
import { createOwnerAction, updateOwnerAction } from "./actions";
import { FOUNDER_CAPABILITIES, FOUNDER_RESPONSIBILITIES, type FounderCapability, type FounderResponsibility } from "@/lib/founders/capabilities";

export type OwnerAccountRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  status: "pending" | "active" | "suspended";
  responsibilities: FounderResponsibility[];
  capabilities: FounderCapability[];
  created_at: string;
};

const DOMAIN_LABELS: Record<FounderResponsibility, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

const CAPABILITY_LABELS: Record<FounderCapability, string> = {
  "workspace.read": "Workspace overview",
  "governance.read": "Read decisions",
  "governance.manage": "Manage decisions",
  "approvals.read": "Read approvals",
  "approvals.request": "Request approvals",
  "approvals.review": "Review approvals",
  "finance.read": "Read finance",
  "finance.manage": "Manage finance",
  "technology.read": "Read technology",
  "technology.manage": "Manage technology",
  "strategy.read": "Read strategy",
  "strategy.manage": "Manage strategy",
  "members.manage": "Manage owner members",
  "audit.read": "Read audit logs",
};

const inputClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

type FormValues = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  status: "active" | "pending" | "suspended";
  responsibilities: FounderResponsibility[];
  capabilities: FounderCapability[];
};

function valuesFromForm(form: HTMLFormElement): FormValues {
  const data = new FormData(form);
  return {
    username: String(data.get("username") ?? ""),
    displayName: String(data.get("displayName") ?? ""),
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
    status: String(data.get("status") ?? "active") as FormValues["status"],
    responsibilities: data.getAll("responsibilities").map(String) as FounderResponsibility[],
    capabilities: data.getAll("capabilities").map(String) as FounderCapability[],
  };
}

function PermissionChoices({
  responsibilities = [],
  capabilities = [],
}: {
  responsibilities?: FounderResponsibility[];
  capabilities?: FounderCapability[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Owner domains</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOUNDER_RESPONSIBILITIES.map((value) => (
            <label key={value} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2.5 text-xs text-[var(--text-muted)]">
              <input type="checkbox" name="responsibilities" value={value} defaultChecked={responsibilities.includes(value)} className="mt-0.5 accent-[var(--accent-violet)]" />
              <span>{DOMAIN_LABELS[value]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Capabilities</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOUNDER_CAPABILITIES.map((value) => (
            <label key={value} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2.5 text-xs text-[var(--text-muted)]">
              <input type="checkbox" name="capabilities" value={value} defaultChecked={capabilities.includes(value)} className="mt-0.5 accent-[var(--accent-violet)]" />
              <span>{CAPABILITY_LABELS[value]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function OwnerAccountsClient({ owners }: { owners: OwnerAccountRow[] }) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = valuesFromForm(form);
    setCreateError(null);
    setCreateSuccess(null);
    startCreate(async () => {
      try {
        await createOwnerAction(values);
        setCreateSuccess("Owner account created. The password is not stored or shown again; share it securely with that owner.");
        createFormRef.current?.reset();
        router.refresh();
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Could not create owner account.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Users size={18} className="text-[var(--accent-violet-deep)]" />
          <p className="mt-3 text-2xl font-semibold">{owners.length} / 3</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Provisioned owner accounts</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <ShieldCheck size={18} className="text-[var(--accent-violet-deep)]" />
          <p className="mt-3 text-2xl font-semibold">{owners.filter((owner) => owner.status === "active").length}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Active memberships</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <KeyRound size={18} className="text-[var(--accent-violet-deep)]" />
          <p className="mt-3 text-2xl font-semibold">Supabase Auth</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Passwords are managed securely, never stored in owner tables</p>
        </div>
      </div>

      {owners.map((owner) => (
        <OwnerEditor key={owner.user_id} owner={owner} />
      ))}

      {owners.length < 3 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--accent-violet-deep)]"><Plus size={18} /></span>
            <div>
              <h2 className="font-semibold">Create owner account</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Set a username, recovery email, initial password, domain responsibilities, and capabilities. Only the Super Admin can provision these accounts.</p>
            </div>
          </div>

          <form ref={createFormRef} onSubmit={handleCreate} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label><span className={labelClass}>Display name</span><input name="displayName" required minLength={2} maxLength={100} className={inputClass} placeholder="Owner full name" /></label>
              <label><span className={labelClass}>Username</span><input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z][a-zA-Z0-9._-]{2,29}" autoComplete="off" className={inputClass} placeholder="owner.username" /></label>
              <label><span className={labelClass}>Recovery email</span><input name="email" required type="email" autoComplete="email" className={inputClass} placeholder="owner@example.com" /></label>
              <label><span className={labelClass}>Initial password (12+ characters)</span><input name="password" required type="password" minLength={12} autoComplete="new-password" className={inputClass} placeholder="Set a strong password" /></label>
            </div>
            <label className="block max-w-xs"><span className={labelClass}>Initial account status</span><select name="status" defaultValue="active" className={inputClass}><option value="active">Active</option><option value="pending">Pending activation</option><option value="suspended">Suspended</option></select></label>
            <PermissionChoices responsibilities={["shared_governance"]} capabilities={["workspace.read", "governance.read", "approvals.read"]} />
            {createError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{createError}</p>}
            {createSuccess && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{createSuccess}</p>}
            <button type="submit" disabled={creating} className="rounded-xl bg-[var(--accent-violet)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{creating ? "Creating account…" : "Create owner account"}</button>
          </form>
        </section>
      )}

      {owners.length >= 3 && (
        <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">All three owner slots are provisioned. Edit an existing account to change its username, password, status, domains, or capabilities.</p>
      )}
    </div>
  );
}

function OwnerEditor({ owner }: { owner: OwnerAccountRow }) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = valuesFromForm(event.currentTarget);
    setError(null);
    setSuccess(null);
    startSave(async () => {
      try {
        const result = await updateOwnerAction(owner.user_id, values);
        setSuccess(result.warning ? `Owner account updated, but session revocation needs attention: ${result.warning}` : "Owner account updated.");
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not update owner account.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--accent-violet-deep)]"><UserRound size={18} /></span>
          <div>
            <h2 className="font-semibold">{owner.display_name || "Unnamed owner"}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{owner.email}</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">Created {new Date(owner.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <span className={"rounded-full border px-3 py-1 text-xs font-medium " + (owner.status === "active" ? "border-emerald-500/30 text-emerald-700" : owner.status === "suspended" ? "border-red-500/30 text-red-600" : "border-amber-500/30 text-amber-700")}>{owner.status}</span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label><span className={labelClass}>Display name</span><input name="displayName" required minLength={2} maxLength={100} defaultValue={owner.display_name ?? ""} className={inputClass} /></label>
          <label><span className={labelClass}>Username</span><input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z][a-zA-Z0-9._-]{2,29}" defaultValue={owner.username ?? ""} className={inputClass} /></label>
          <label><span className={labelClass}>Recovery email</span><input name="email" required type="email" defaultValue={owner.email} className={inputClass} /></label>
          <label><span className={labelClass}>Set new password (leave blank to keep current)</span><input name="password" type="password" minLength={12} autoComplete="new-password" className={inputClass} placeholder="12+ characters" /></label>
        </div>
        <label className="block max-w-xs"><span className={labelClass}>Membership status</span><select name="status" defaultValue={owner.status} className={inputClass}><option value="active">Active</option><option value="pending">Pending activation</option><option value="suspended">Suspended</option></select></label>
        <PermissionChoices responsibilities={owner.responsibilities} capabilities={owner.capabilities} />
        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{success}</p>}
        <button type="submit" disabled={saving} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60">{saving ? "Saving…" : "Save owner settings"}</button>
      </form>
    </section>
  );
}

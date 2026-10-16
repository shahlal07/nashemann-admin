"use client";

import { useState, useTransition } from "react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { createOwnerAccountAction } from "./actions";

const inputClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

const RESPONSIBILITIES = [
  { value: "finance_governance", label: "Finance & Governance" },
  { value: "product_technology", label: "Product & Technology" },
  { value: "business_strategy", label: "Business & Strategy" },
  { value: "shared_governance", label: "Shared Founder Governance" },
];
const CAPABILITIES = [
  { value: "governance.read", label: "Read governance decisions" },
  { value: "governance.manage", label: "Create/manage governance decisions" },
  { value: "approvals.read", label: "Read approval requests" },
  { value: "approvals.request", label: "Request approvals" },
  { value: "approvals.review", label: "Review other founders' approvals" },
  { value: "finance.read", label: "Read finance/settlement records" },
  { value: "technology.read", label: "Read technology work" },
  { value: "technology.manage", label: "Manage technology decisions" },
  { value: "strategy.read", label: "Read business strategy" },
  { value: "strategy.manage", label: "Manage business strategy" },
  { value: "audit.read", label: "Read governance audit history" },
];

export type OwnerManagementRow = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  status: string;
  responsibilities: string[];
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
};

export function OwnerManagementClient({ initialOwners }: { initialOwners: OwnerManagementRow[] }) {
  const [owners, setOwners] = useState(initialOwners);
  const [open, setOpen] = useState(initialOwners.length === 0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [updateExistingAccount, setUpdateExistingAccount] = useState(false);
  const [editingExistingOwner, setEditingExistingOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleValue(value: string, checked: boolean, setter: (next: string[]) => void, current: string[]) {
    setter(checked ? [...current, value] : current.filter((item) => item !== value));
  }

  function loadOwner(owner: OwnerManagementRow) {
    setEditingExistingOwner(true);
    setUsername(owner.username);
    setEmail(owner.email);
    setDisplayName(owner.displayName);
    setPassword("");
    setResponsibilities(owner.responsibilities);
    setCapabilities(owner.capabilities);
    setUpdateExistingAccount(true);
    setError(null);
    setCreatedNotice(null);
    setOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedNotice(null);
    startTransition(async () => {
      try {
        const saved = await createOwnerAccountAction({
          username,
          email,
          displayName,
          password,
          responsibilities,
          capabilities,
          updateExistingAccount,
        });
        const now = new Date().toISOString();
        const previous = owners.find((owner) => owner.userId === saved.userId);
        const updated: OwnerManagementRow = {
          userId: saved.userId,
          username: saved.username,
          email: saved.email,
          displayName: saved.displayName,
          status: "active",
          responsibilities: [...responsibilities],
          capabilities: [...capabilities],
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        setOwners((current) => current.some((owner) => owner.userId === saved.userId)
          ? current.map((owner) => owner.userId === saved.userId ? updated : owner)
          : [...current, updated]);
        setCreatedNotice(
          saved.mode === "created"
            ? "Owner account created. Share the login email and password securely; the password will not be displayed again."
            : saved.mode === "updated"
              ? "Existing owner credentials and access settings updated successfully."
              : "Existing Supabase identity linked to founder access and its password set successfully."
        );
        setUsername("");
        setEmail("");
        setDisplayName("");
        setPassword("");
        setResponsibilities([]);
        setCapabilities([]);
        setUpdateExistingAccount(false);
        setEditingExistingOwner(false);
        setOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save owner account.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet)]">Super Admin only</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--text)] sm:text-3xl">Founder access</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">Create individual founder accounts or update a founder's login password, username, responsibilities, and capabilities from this panel.</p>
        </div>
        <button type="button" onClick={() => { if (open) { setOpen(false); } else { setEditingExistingOwner(false); setUsername(""); setEmail(""); setDisplayName(""); setPassword(""); setResponsibilities([]); setCapabilities([]); setUpdateExistingAccount(false); setError(null); setCreatedNotice(null); setOpen(true); } }} className="accent-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-gradient)] px-4 py-2.5 text-sm font-semibold text-black">
          <UserPlus size={16} /> {open ? "Close form" : "Create / manage owner"}
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[var(--accent-violet)]" />
        <p>Passwords are handled only by Supabase Auth on the server. They are never stored in the owner membership table or shown again after saving. Linking an existing account can replace its password, so verify the exact login email and explicitly confirm below.</p>
      </div>

      {createdNotice && <div role="status" className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">{createdNotice}</div>}
      {error && <div role="alert" className="rounded-lg border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}

      {open && <form onSubmit={submit} className="glass-panel space-y-5 rounded-[var(--radius-lg)] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={labelClass}>Username</span><input required minLength={3} maxLength={32} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className={inputClass} placeholder="founder.tech" /></label>
          <label><span className={labelClass}>{editingExistingOwner ? "Login email (fixed for existing account)" : "Login email"}</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className={inputClass} placeholder="founder@nashemann.store" disabled={editingExistingOwner} /></label>
          <label><span className={labelClass}>Display name</span><input required minLength={2} maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>New password (12+ characters)</span><input required minLength={12} maxLength={128} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputClass} /></label>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3.5 text-sm">
          <input type="checkbox" checked={updateExistingAccount} onChange={(event) => setUpdateExistingAccount(event.target.checked)} className="mt-0.5" />
          <span className="text-[var(--text-muted)]"><span className="font-medium text-[var(--text)]">I confirm this existing Supabase identity belongs to the intended founder; link it or replace its password if needed.</span><span className="mt-1 block text-xs leading-5">Use this only for the exact account you intend to manage. Existing staff/admin and vendor-linked identities are rejected to prevent role mixing.</span></span>
        </label>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-[var(--text)]">Responsibilities</legend>
          <div className="grid gap-2 sm:grid-cols-2">{RESPONSIBILITIES.map((item) => <label key={item.value} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]"><input type="checkbox" checked={responsibilities.includes(item.value)} onChange={(e) => toggleValue(item.value, e.target.checked, setResponsibilities, responsibilities)} />{item.label}</label>)}</div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-[var(--text)]">Capabilities</legend>
          <div className="grid gap-2 sm:grid-cols-2">{CAPABILITIES.map((item) => <label key={item.value} className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]"><input className="mt-0.5" type="checkbox" checked={capabilities.includes(item.value)} onChange={(e) => toggleValue(item.value, e.target.checked, setCapabilities, capabilities)} />{item.label}</label>)}</div>
        </fieldset>

        <div className="flex flex-wrap gap-2"><button disabled={pending} type="submit" className="accent-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-gradient)] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"><KeyRound size={15} />{pending ? "Saving account…" : updateExistingAccount ? "Save / link existing account" : "Create owner account"}</button><p className="self-center text-xs text-[var(--text-faint)]">The operation is Super Admin-authorized and compensates for failed membership/password changes where possible.</p></div>
      </form>}

      <section className="glass-panel rounded-[var(--radius-lg)] p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Owner accounts</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Live membership records from Supabase. {owners.length} account(s) currently visible.</p>
        {owners.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No founder memberships are configured yet.</p> : <div className="mt-4 divide-y divide-[var(--border)]">{owners.map((owner) => <div key={owner.userId} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-[var(--text)]">{owner.displayName || owner.username}</p><p className="text-xs text-[var(--text-faint)]">@{owner.username}</p><p className="text-xs text-[var(--text-muted)]">{owner.email || "Login email unavailable"}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]">{owner.status}</span><button type="button" onClick={() => loadOwner(owner)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-hover)]">Edit credentials</button></div></div><p className="mt-2 text-xs text-[var(--text-muted)]">Responsibilities: {owner.responsibilities.join(", ").replaceAll("_", " ") || "None assigned"}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Capabilities: {owner.capabilities.join(", ") || "None assigned"}</p></div>)}</div>}
      </section>
    </div>
  );
}

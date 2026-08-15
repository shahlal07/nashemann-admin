"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  ShoppingBag,
  Wallet,
  UserPlus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { VendorStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatPKR, formatDate } from "@/lib/utils";

const TABS = ["Overview", "Branding & Theme", "Admins & Access", "Billing", "Danger Zone"] as const;
type Tab = (typeof TABS)[number];

const FONT_OPTIONS = ["Inter", "Space Grotesk", "Playfair Display", "Poppins"] as const;
const PLAN_LABEL = { per_order: "Pay Per Order (Rs 15/order)", monthly: "Monthly (Rs 7,000/mo)" };

type PricingPlan = "per_order" | "monthly";
type VendorStatus = "provisioning" | "active" | "suspended" | "failed";

export type VendorRow = {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  category: string | null;
  city: string;
  status: VendorStatus;
  plan: PricingPlan;
  orders_last_30d: number;
  revenue_last_30d: number;
  joined_at: string;
  theme_accent_from: string;
  theme_accent_to: string;
  theme_logo_emoji: string;
  theme_font: string;
};

export type VendorAdminRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  added_at: string;
};

export type CategorySchemaRow = {
  category: string;
  model: "weight_based" | "variant_based" | "simple";
  fields: string[];
  variant_example: string | null;
  note: string;
} | null;

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] accent-ring";

export function VendorDetailClient({
  vendor: initialVendor,
  initialAdmins,
  categorySchema,
}: {
  vendor: VendorRow;
  initialAdmins: VendorAdminRow[];
  categorySchema: CategorySchemaRow;
}) {
  const [vendor, setVendor] = useState(initialVendor);
  const [tab, setTab] = useState<Tab>("Overview");
  const [theme, setTheme] = useState({
    accentFrom: vendor.theme_accent_from,
    accentTo: vendor.theme_accent_to,
    logoEmoji: vendor.theme_logo_emoji,
    font: vendor.theme_font,
  });
  const [status, setStatus] = useState(vendor.status);
  const [plan, setPlan] = useState(vendor.plan);
  const [savingTheme, setSavingTheme] = useState(false);
  const [saved, setSaved] = useState(false);
  const [admins, setAdmins] = useState(initialAdmins);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveTheme() {
    setSavingTheme(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("vendors")
      .update({
        theme_accent_from: theme.accentFrom,
        theme_accent_to: theme.accentTo,
        theme_logo_emoji: theme.logoEmoji,
        theme_font: theme.font,
      })
      .eq("id", vendor.id);

    setSavingTheme(false);
    if (updateError) {
      setError(`Couldn't save theme: ${updateError.message}`);
      return;
    }
    setVendor((v) => ({
      ...v,
      theme_accent_from: theme.accentFrom,
      theme_accent_to: theme.accentTo,
      theme_logo_emoji: theme.logoEmoji,
      theme_font: theme.font,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function toggleStatus() {
    setBusy(true);
    setError(null);
    const nextStatus: VendorStatus = status === "suspended" ? "active" : "suspended";
    const supabase = createClient();
    const { error: updateError } = await supabase.from("vendors").update({ status: nextStatus }).eq("id", vendor.id);
    setBusy(false);
    if (updateError) {
      setError(`Couldn't update status: ${updateError.message}`);
      return;
    }
    setStatus(nextStatus);
  }

  async function changePlan() {
    setBusy(true);
    setError(null);
    const nextPlan: PricingPlan = plan === "per_order" ? "monthly" : "per_order";
    const supabase = createClient();
    const { error: updateError } = await supabase.from("vendors").update({ plan: nextPlan }).eq("id", vendor.id);
    setBusy(false);
    if (updateError) {
      setError(`Couldn't change plan: ${updateError.message}`);
      return;
    }
    setPlan(nextPlan);
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("vendor_admins")
      .insert({ vendor_id: vendor.id, name: newAdminName.trim(), email: newAdminEmail.trim(), role: "staff" })
      .select("id, name, email, role, added_at")
      .single();
    setBusy(false);
    if (insertError || !data) {
      setError(`Couldn't add admin: ${insertError?.message ?? "unknown error"}`);
      return;
    }
    setAdmins((prev) => [...prev, data as VendorAdminRow]);
    setNewAdminName("");
    setNewAdminEmail("");
    setAddingAdmin(false);
  }

  async function removeAdmin(id: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("vendor_admins").delete().eq("id", id);
    setBusy(false);
    if (deleteError) {
      setError(`Couldn't remove admin: ${deleteError.message}`);
      return;
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <Link
        href="/vendors"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft size={14} /> All vendors
      </Link>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}33, ${theme.accentTo}33)` }}
          >
            {theme.logoEmoji}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-semibold text-[var(--text)]">{vendor.name}</h1>
              <VendorStatusBadge status={status} />
            </div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-violet)]"
            >
              <Globe size={13} /> {vendor.subdomain}.nashemann.com <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            View storefront
          </Button>
          <Button variant="secondary" size="sm">
            Impersonate admin
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
              tab === t ? "text-[var(--text)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            }`}
          >
            {t}
            {tab === t && (
              <motion.div
                layoutId="vendor-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5"
                style={{ background: "var(--accent-gradient)" }}
              />
            )}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)]">Orders (30d)</p>
            <p className="font-display mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--text)]">
              <ShoppingBag size={18} className="text-[var(--accent-violet)]" /> {vendor.orders_last_30d}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)]">Revenue (30d)</p>
            <p className="font-display mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--text)]">
              <Wallet size={18} className="text-[var(--accent-amber)]" /> {formatPKR(vendor.revenue_last_30d)}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)]">Onboarded</p>
            <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{formatDate(vendor.joined_at)}</p>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader title="Store details" />
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-faint)]">Category</dt>
                <dd className="mt-0.5 text-[var(--text)]">{vendor.category ?? "Uncategorized"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-faint)]">City</dt>
                <dd className="mt-0.5 text-[var(--text)]">{vendor.city}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-faint)]">Subdomain</dt>
                <dd className="mt-0.5 text-[var(--text)]">{vendor.subdomain}.nashemann.com</dd>
              </div>
              <div>
                <dt className="text-[var(--text-faint)]">Custom domain</dt>
                <dd className="mt-0.5 text-[var(--text)]">{vendor.custom_domain ?? "Not configured"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <Sparkles size={13} className="text-[var(--accent-violet)]" /> AI Assistant
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              <p className="text-sm font-semibold text-[var(--text)]">Enabled, scoped to {vendor.name}</p>
            </div>
            <p className="mt-1.5 text-xs text-[var(--text-faint)]">
              Answers customers using only this store&apos;s own products, orders, and policies — escalates to human
              support automatically. Never shares data across vendors.
            </p>
          </Card>

          {categorySchema && (
            <Card className="lg:col-span-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                <Layers size={13} /> Product settings ({vendor.category})
              </p>
              <p className="mt-1.5 text-xs text-[var(--text-faint)]">{categorySchema.note}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {categorySchema.fields.map((f) => (
                  <span key={f} className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]">
                    {f}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "Branding & Theme" && (
        <Card>
          <CardHeader
            title="Storefront theme"
            description="Controls this vendor's live storefront — accent gradient, logo mark, and typeface."
            action={
              <Button variant="primary" size="sm" onClick={saveTheme} disabled={savingTheme}>
                {saved ? "Saved ✓" : savingTheme ? "Saving…" : "Save changes"}
              </Button>
            }
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Accent — from</span>
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1.5">
                    <input
                      type="color"
                      value={theme.accentFrom}
                      onChange={(e) => setTheme({ ...theme, accentFrom: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent"
                    />
                    <span className="font-mono text-xs text-[var(--text-muted)]">{theme.accentFrom}</span>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Accent — to</span>
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1.5">
                    <input
                      type="color"
                      value={theme.accentTo}
                      onChange={(e) => setTheme({ ...theme, accentTo: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent"
                    />
                    <span className="font-mono text-xs text-[var(--text-muted)]">{theme.accentTo}</span>
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Logo emoji (placeholder mark)</span>
                <input
                  value={theme.logoEmoji}
                  onChange={(e) => setTheme({ ...theme, logoEmoji: e.target.value })}
                  maxLength={2}
                  className="w-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-lg outline-none accent-ring"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Typeface</span>
                <div className="flex flex-wrap gap-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setTheme({ ...theme, font: f })}
                      className={`rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors ${
                        theme.font === f
                          ? "border-[var(--accent-violet)] text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                      }`}
                      style={theme.font === f ? { background: "var(--accent-gradient-soft)" } : undefined}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Live preview</p>
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                <div
                  className="flex h-24 items-center justify-center text-3xl"
                  style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
                >
                  {theme.logoEmoji}
                </div>
                <div className="space-y-2 bg-[var(--surface-solid)] p-4">
                  <p className="text-sm font-semibold text-[var(--text)]">{vendor.name}</p>
                  <div
                    className="inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
                  >
                    Shop now
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === "Admins & Access" && (
        <Card>
          <CardHeader
            title="Store admins"
            description="Accounts with access to this vendor's own admin panel."
            action={
              <Button variant="primary" size="sm" onClick={() => setAddingAdmin((v) => !v)}>
                <UserPlus size={14} /> Add admin
              </Button>
            }
          />

          {addingAdmin && (
            <form onSubmit={addAdmin} className="mb-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
              <label className="block flex-1 min-w-[10rem]">
                <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Name</span>
                <input required value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className={inputClass} />
              </label>
              <label className="block flex-1 min-w-[10rem]">
                <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Email</span>
                <input required type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className={inputClass} />
              </label>
              <Button type="submit" variant="primary" size="sm" disabled={busy}>
                Add
              </Button>
            </form>
          )}

          <div className="divide-y divide-[var(--border)]">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text)]">
                    {admin.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{admin.name}</p>
                    <p className="text-xs text-[var(--text-faint)]">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={admin.role === "owner" ? "violet" : "neutral"}>{admin.role}</Badge>
                  {admin.role !== "owner" && (
                    <button
                      onClick={() => removeAdmin(admin.id)}
                      disabled={busy}
                      className="text-[var(--text-faint)] hover:text-[var(--danger)]"
                      aria-label="Remove admin"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {admins.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">No admins yet.</p>}
          </div>
        </Card>
      )}

      {tab === "Billing" && (
        <Card>
          <CardHeader title="Pricing plan" description="Which plan this vendor pays under." />
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{PLAN_LABEL[plan]}</p>
              <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                {plan === "per_order"
                  ? "Customer pays the platform fee at checkout — no bill to this vendor."
                  : "Vendor pays a flat monthly fee regardless of order volume."}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={changePlan} disabled={busy}>
              Change plan
            </Button>
          </div>
        </Card>
      )}

      {tab === "Danger Zone" && (
        <Card className="border-[rgba(251,113,133,0.25)]">
          <CardHeader title="Danger zone" description="These actions affect this vendor's live storefront immediately." />
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={17} className="text-[var(--warning)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {status === "suspended" ? "Reactivate this store" : "Suspend this store"}
                  </p>
                  <p className="text-xs text-[var(--text-faint)]">
                    {status === "suspended"
                      ? "Restores the storefront and admin panel access."
                      : "Storefront goes offline, admin login blocked. Data is preserved."}
                  </p>
                </div>
              </div>
              <Button
                variant={status === "suspended" ? "primary" : "danger"}
                size="sm"
                onClick={toggleStatus}
                disabled={busy}
              >
                {status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

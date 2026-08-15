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
  HeartPulse,
  ChevronDown,
  TrendingDown,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { VendorStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPKR, formatDate } from "@/lib/utils";
import type { VendorHealth, ChurnRisk } from "@/lib/vendor-signals";
import {
  setVendorWhiteLabelAction,
  saveVendorThemeAction,
  toggleVendorStatusAction,
  changeVendorPlanAction,
  changeVendorCurrencyAction,
  addVendorAdminAction,
  removeVendorAdminAction,
} from "./actions";

const CURRENCY_OPTIONS = ["PKR", "USD", "AED", "SAR"] as const;

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
  white_label_enabled: boolean;
  currency: string;
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

function HealthScoreCard({ health }: { health: VendorHealth }) {
  const [expanded, setExpanded] = useState(false);
  const tone = health.score === null ? "neutral" : health.score >= 75 ? "success" : health.score >= 50 ? "warning" : "danger";
  const ringColor =
    tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--text-faint)";

  return (
    <Card className="lg:col-span-3">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ border: `3px solid ${ringColor}`, color: "var(--text)" }}
          >
            {health.score ?? "—"}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]">
              <HeartPulse size={14} className="text-[var(--accent-violet)]" /> Vendor health score
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-faint)]">
              {health.score === null ? "Not enough data yet to score this vendor." : "Composite of payment, reviews, reliability & stability."}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-[var(--text-faint)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          {health.components.map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text)]">
                  {c.label} <span className="text-[var(--text-faint)]">({Math.round(c.weight * 100)}% weight)</span>
                </span>
                <span className="font-semibold text-[var(--text)]">{c.score === null ? "N/A" : `${c.score}/100`}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.score ?? 0}%`,
                    background: c.score === null ? "transparent" : "var(--accent-gradient)",
                  }}
                />
              </div>
              <p className="mt-1 text-[0.7rem] text-[var(--text-faint)]">{c.detail}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function VendorDetailClient({
  vendor: initialVendor,
  initialAdmins,
  categorySchema,
  health,
  churnRisk,
  isFinanceStaff,
}: {
  vendor: VendorRow;
  initialAdmins: VendorAdminRow[];
  categorySchema: CategorySchemaRow;
  health: VendorHealth;
  churnRisk: ChurnRisk;
  isFinanceStaff: boolean;
}) {
  const [vendor, setVendor] = useState(initialVendor);
  const [whiteLabelBusy, setWhiteLabelBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [theme, setTheme] = useState({
    accentFrom: vendor.theme_accent_from,
    accentTo: vendor.theme_accent_to,
    logoEmoji: vendor.theme_logo_emoji,
    font: vendor.theme_font,
  });
  const [status, setStatus] = useState(vendor.status);
  const [plan, setPlan] = useState(vendor.plan);
  const [currencyBusy, setCurrencyBusy] = useState(false);
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
    try {
      await saveVendorThemeAction(vendor.id, vendor.name, theme);
      setVendor((v) => ({
        ...v,
        theme_accent_from: theme.accentFrom,
        theme_accent_to: theme.accentTo,
        theme_logo_emoji: theme.logoEmoji,
        theme_font: theme.font,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? `Couldn't save theme: ${err.message}` : "Couldn't save theme");
    } finally {
      setSavingTheme(false);
    }
  }

  async function toggleStatus() {
    setBusy(true);
    setError(null);
    const nextStatus: VendorStatus = status === "suspended" ? "active" : "suspended";
    try {
      await toggleVendorStatusAction(vendor.id, vendor.name, nextStatus);
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? `Couldn't update status: ${err.message}` : "Couldn't update status");
    } finally {
      setBusy(false);
    }
  }

  async function changePlan() {
    setBusy(true);
    setError(null);
    const nextPlan: PricingPlan = plan === "per_order" ? "monthly" : "per_order";
    try {
      await changeVendorPlanAction(vendor.id, vendor.name, nextPlan);
      setPlan(nextPlan);
    } catch (err) {
      setError(err instanceof Error ? `Couldn't change plan: ${err.message}` : "Couldn't change plan");
    } finally {
      setBusy(false);
    }
  }

  async function changeCurrency(next: string) {
    setCurrencyBusy(true);
    setError(null);
    try {
      await changeVendorCurrencyAction(vendor.id, vendor.name, next);
      setVendor((v) => ({ ...v, currency: next }));
    } catch (err) {
      setError(err instanceof Error ? `Couldn't change currency: ${err.message}` : "Couldn't change currency");
    } finally {
      setCurrencyBusy(false);
    }
  }

  async function toggleWhiteLabel() {
    setWhiteLabelBusy(true);
    setError(null);
    const next = !vendor.white_label_enabled;
    try {
      await setVendorWhiteLabelAction(vendor.id, vendor.name, next);
      setVendor((v) => ({ ...v, white_label_enabled: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update white-label setting");
    } finally {
      setWhiteLabelBusy(false);
    }
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await addVendorAdminAction(vendor.id, vendor.name, newAdminName, newAdminEmail);
      setAdmins((prev) => [...prev, data as VendorAdminRow]);
      setNewAdminName("");
      setNewAdminEmail("");
      setAddingAdmin(false);
    } catch (err) {
      setError(err instanceof Error ? `Couldn't add admin: ${err.message}` : "Couldn't add admin");
    } finally {
      setBusy(false);
    }
  }

  async function removeAdmin(id: string) {
    const target = admins.find((a) => a.id === id);
    setBusy(true);
    setError(null);
    try {
      await removeVendorAdminAction(vendor.id, vendor.name, id, target ? `${target.name} (${target.email})` : id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? `Couldn't remove admin: ${err.message}` : "Couldn't remove admin");
    } finally {
      setBusy(false);
    }
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
              {churnRisk.atRisk && (
                <span title={churnRisk.reasons.join(" · ")}>
                  <Badge tone="danger" className="cursor-help">
                    <TrendingDown size={11} /> Churn risk
                  </Badge>
                </span>
              )}
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

          <HealthScoreCard health={health} />

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

      {tab === "Billing" && (
        <Card className="mt-4">
          <CardHeader
            title="Display currency"
            description="Groundwork only — amounts are still stored and settled in PKR; this only changes what's shown alongside the PKR figure, using placeholder FX rates."
          />
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <p className="text-sm font-medium text-[var(--text)]">{vendor.currency}</p>
            <select
              value={vendor.currency}
              onChange={(e) => changeCurrency(e.target.value)}
              disabled={currencyBusy}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] outline-none"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {tab === "Billing" && (
        <Card className="mt-4">
          <CardHeader
            title="White-label"
            description="Hides the 'Powered by Nashemann' badge on this vendor's storefront-facing surfaces (e.g. the homepage showcase card)."
          />
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">
                {vendor.white_label_enabled ? "White-label enabled" : "White-label disabled"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                {isFinanceStaff
                  ? "Toggling this immediately changes what customers see on this vendor's public surfaces."
                  : "Only Finance or a super admin can change this setting."}
              </p>
            </div>
            <Button
              variant={vendor.white_label_enabled ? "danger" : "primary"}
              size="sm"
              onClick={toggleWhiteLabel}
              disabled={!isFinanceStaff || whiteLabelBusy}
            >
              {whiteLabelBusy ? "Saving…" : vendor.white_label_enabled ? "Disable" : "Enable"}
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

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  ShoppingBag,
  Wallet,
  UserPlus,
  Trash2,
  Pencil,
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
  changeVendorCategoryAction,
  addVendorAdminAction,
  updateVendorAdminAction,
  sendVendorAdminResetLinkAction,
  removeVendorAdminAction,
  revokeVendorAdminSessionsAction,
  updateVendorSlugAction,
  updateVendorControlProfileAction,
  updateVendorCustomDomainAction,
} from "./actions";

const CURRENCY_OPTIONS = ["PKR", "USD", "AED", "SAR"] as const;
const ROOT_DOMAIN = "nashemann.store";
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
  theme_logo_url: string | null;
  theme_font: string;
  white_label_enabled: boolean;
  currency: string;
  fee_type: "percent" | "fixed";
  fee_override_percent: number | null;
  fee_override_fixed_amount: number | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
};

export type VendorAdminRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "staff";
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
  const ringColor = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--text-faint)";
  return (
    <Card className="lg:col-span-3">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ border: `3px solid ${ringColor}`, color: "var(--text)" }}>{health.score ?? "—"}</div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]"><HeartPulse size={14} className="text-[var(--accent-violet)]" /> Vendor health score</p>
            <p className="mt-0.5 text-xs text-[var(--text-faint)]">{health.score === null ? "Not enough data yet to score this vendor." : "Composite of payment, reviews, reliability & stability."}</p>
          </div>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-[var(--text-faint)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">{health.components.map((c) => <div key={c.key}><div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-[var(--text)]">{c.label} <span className="text-[var(--text-faint)]">({Math.round(c.weight * 100)}% weight)</span></span><span className="font-semibold text-[var(--text)]">{c.score === null ? "N/A" : `${c.score}/100`}</span></div><div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]"><div className="h-full rounded-full" style={{ width: `${c.score ?? 0}%`, background: c.score === null ? "transparent" : "var(--accent-gradient)" }} /></div><p className="mt-1 text-[0.7rem] text-[var(--text-faint)]">{c.detail}</p></div>)}</div>}
    </Card>
  );
}

export function VendorDetailClient({ vendor: initialVendor, initialAdmins, categorySchema, allCategories, health, churnRisk, isFinanceStaff }: { vendor: VendorRow; initialAdmins: VendorAdminRow[]; categorySchema: CategorySchemaRow; allCategories: string[]; health: VendorHealth; churnRisk: ChurnRisk; isFinanceStaff: boolean; }) {
  const [vendor, setVendor] = useState(initialVendor);
  const [categoryInput, setCategoryInput] = useState(initialVendor.category ?? "");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [whiteLabelBusy, setWhiteLabelBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [theme, setTheme] = useState({ accentFrom: vendor.theme_accent_from, accentTo: vendor.theme_accent_to, logoEmoji: vendor.theme_logo_emoji, logoUrl: vendor.theme_logo_url, font: vendor.theme_font });
  const [status, setStatus] = useState(vendor.status);
  const [plan, setPlan] = useState(vendor.plan);
  const [currencyBusy, setCurrencyBusy] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [admins, setAdmins] = useState(initialAdmins);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(vendor.subdomain);
  const [slugBusy, setSlugBusy] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState(vendor.custom_domain?.endsWith(".nashemann.store") ? "" : (vendor.custom_domain ?? ""));
  const [customDomainBusy, setCustomDomainBusy] = useState(false);
  const [savingControl, setSavingControl] = useState(false);
  const [control, setControl] = useState({ description: vendor.description ?? "", contactEmail: vendor.contact_email ?? "", contactPhone: vendor.contact_phone ?? "", instagramUrl: vendor.instagram_url ?? "", youtubeUrl: vendor.youtube_url ?? "", feeType: (vendor.fee_type ?? "percent") as "percent" | "fixed", feeOverridePercent: vendor.fee_override_percent == null ? "" : String(vendor.fee_override_percent), feeOverrideFixedAmount: vendor.fee_override_fixed_amount == null ? "" : String(vendor.fee_override_fixed_amount) });
  const storefrontDomain = `${vendor.subdomain}.${ROOT_DOMAIN}`;
  const adminDomain = `admin.${vendor.subdomain}.${ROOT_DOMAIN}`;

  async function saveCustomDomain() { setCustomDomainBusy(true); setError(null); try { const next = await updateVendorCustomDomainAction(vendor.id, vendor.name, vendor.subdomain, customDomainInput); setVendor(v => ({ ...v, custom_domain: next })); setCustomDomainInput(next.endsWith(".nashemann.store") ? "" : next); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't update custom domain"); } finally { setCustomDomainBusy(false); } }
  async function saveControlProfile() { setSavingControl(true); setError(null); try { const rawFee = control.feeOverridePercent.trim(); const rawFixed = control.feeOverrideFixedAmount.trim(); await updateVendorControlProfileAction(vendor.id, vendor.name, { description: control.description, contactEmail: control.contactEmail, contactPhone: control.contactPhone, instagramUrl: control.instagramUrl, youtubeUrl: control.youtubeUrl, feeType: control.feeType, feeOverridePercent: rawFee === "" ? null : Number(rawFee), feeOverrideFixedAmount: rawFixed === "" ? null : Number(rawFixed) }); setVendor(v => ({ ...v, description: control.description, contact_email: control.contactEmail || null, contact_phone: control.contactPhone || null, instagram_url: control.instagramUrl || null, youtube_url: control.youtubeUrl || null, fee_type: control.feeType, fee_override_percent: rawFee === "" ? null : Number(rawFee), fee_override_fixed_amount: rawFixed === "" ? null : Number(rawFixed) })); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save platform controls"); } finally { setSavingControl(false); } }
  async function saveSlug() { if (!slugInput.trim() || slugInput.trim().toLowerCase() === vendor.subdomain) { setEditingSlug(false); setSlugInput(vendor.subdomain); return; } setSlugBusy(true); setError(null); try { const nextSlug = await updateVendorSlugAction(vendor.id, vendor.name, vendor.subdomain, slugInput); setVendor(v => ({ ...v, subdomain: nextSlug })); setSlugInput(nextSlug); setEditingSlug(false); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't update slug"); } finally { setSlugBusy(false); } }
  async function uploadLogo(file: File | undefined) { if (!file) return; if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; } if (file.size > 5 * 1024 * 1024) { setError("Logo images must be 5 MB or smaller."); return; } setUploadingLogo(true); setError(null); try { const supabase = createClient(); const ext = file.name.split(".").pop()?.toLowerCase() || "png"; const path = `vendors/${vendor.id}/logo-${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage.from("vendor-logos").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" }); if (uploadError) throw uploadError; const { data } = supabase.storage.from("vendor-logos").getPublicUrl(path); setTheme(t => ({ ...t, logoUrl: data.publicUrl })); } catch (err) { setError(err instanceof Error ? `Couldn't upload logo: ${err.message}` : "Couldn't upload logo"); } finally { setUploadingLogo(false); } }
  async function saveTheme() { setSavingTheme(true); setError(null); try { await saveVendorThemeAction(vendor.id, vendor.name, theme); setVendor(v => ({ ...v, theme_accent_from: theme.accentFrom, theme_accent_to: theme.accentTo, theme_logo_emoji: theme.logoEmoji, theme_logo_url: theme.logoUrl, theme_font: theme.font })); setSaved(true); setTimeout(() => setSaved(false), 1800); } catch (err) { setError(err instanceof Error ? `Couldn't save theme: ${err.message}` : "Couldn't save theme"); } finally { setSavingTheme(false); } }
  async function toggleStatus() { setBusy(true); setError(null); const nextStatus: VendorStatus = status === "suspended" ? "active" : "suspended"; try { await toggleVendorStatusAction(vendor.id, vendor.name, nextStatus); setStatus(nextStatus); } catch (err) { setError(err instanceof Error ? `Couldn't update status: ${err.message}` : "Couldn't update status"); } finally { setBusy(false); } }
  async function changePlan() { setBusy(true); setError(null); const nextPlan: PricingPlan = plan === "per_order" ? "monthly" : "per_order"; try { await changeVendorPlanAction(vendor.id, vendor.name, nextPlan); setPlan(nextPlan); } catch (err) { setError(err instanceof Error ? `Couldn't change plan: ${err.message}` : "Couldn't change plan"); } finally { setBusy(false); } }
  async function changeCurrency(next: string) { setCurrencyBusy(true); setError(null); try { await changeVendorCurrencyAction(vendor.id, vendor.name, next); setVendor(v => ({ ...v, currency: next })); } catch (err) { setError(err instanceof Error ? `Couldn't change currency: ${err.message}` : "Couldn't change currency"); } finally { setCurrencyBusy(false); } }
  async function saveCategory() { if (!categoryInput || categoryInput === vendor.category) return; setCategoryBusy(true); setError(null); try { await changeVendorCategoryAction(vendor.id, vendor.name, categoryInput); setVendor(v => ({ ...v, category: categoryInput })); } catch (err) { setError(err instanceof Error ? `Couldn't change category: ${err.message}` : "Couldn't change category"); } finally { setCategoryBusy(false); } }
  async function toggleWhiteLabel() { setWhiteLabelBusy(true); setError(null); const next = !vendor.white_label_enabled; try { await setVendorWhiteLabelAction(vendor.id, vendor.name, next); setVendor(v => ({ ...v, white_label_enabled: next })); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't update white-label setting"); } finally { setWhiteLabelBusy(false); } }

  async function saveAdminCredentials(e: React.FormEvent) {
    e.preventDefault();
    const current = admins.find(a => a.id === editingAdminId);
    if (!current || !editAdminName.trim() || !editAdminEmail.trim()) return;
    setBusy(true); setError(null); setTemporaryPassword(null);
    try {
      const result = await updateVendorAdminAction(vendor.id, vendor.name, current.id, { name: editAdminName, email: editAdminEmail, password: editAdminPassword || undefined, previousEmail: current.email }, vendor.subdomain);
      if ("error" in result) { setError(result.error); return; }
      setAdmins(prev => prev.map(a => a.id === current.id ? { ...a, ...result.row } : a));
      setEditingAdminId(null); setEditAdminPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't update admin credentials"); }
    finally { setBusy(false); }
  }

  async function sendAdminReset(admin: VendorAdminRow) {
    setBusy(true); setError(null); setTemporaryPassword(null);
    try {
      const result = await sendVendorAdminResetLinkAction(vendor.id, vendor.name, admin.id, admin.email, admin.name, vendor.subdomain);
      if ("error" in result) { setError(result.error); return; }
      setTemporaryPassword(result.temporaryPassword);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't generate temporary password"); }
    finally { setBusy(false); }
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;
    setBusy(true); setError(null); setTemporaryPassword(null);
    try {
      const data = await addVendorAdminAction(vendor.id, vendor.name, newAdminName, newAdminEmail, "staff", vendor.subdomain);
      if ("error" in data) { setError(`Couldn't add admin: ${data.error}`); return; }
      const { temporaryPassword: generatedPassword, ...adminRow } = data;
      setAdmins(prev => [...prev, adminRow as VendorAdminRow]);
      setTemporaryPassword(generatedPassword ?? null);
      setNewAdminName(""); setNewAdminEmail(""); setAddingAdmin(false);
    } catch (err) { setError(err instanceof Error ? `Couldn't add admin: ${err.message}` : "Couldn't add admin"); }
    finally { setBusy(false); }
  }

  async function removeAdmin(id: string) { const target = admins.find(a => a.id === id); setBusy(true); setError(null); try { const result = await removeVendorAdminAction(vendor.id, vendor.name, id, target ? `${target.name} (${target.email})` : id, target?.email); if ("error" in result) { setError(result.error); return; } setAdmins(prev => prev.filter(a => a.id !== id)); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't remove admin"); } finally { setBusy(false); } }
  async function revokeSessions(admin: VendorAdminRow) { setBusy(true); setError(null); try { const result = await revokeVendorAdminSessionsAction(vendor.id, vendor.name, admin.id, admin.name, admin.email); if ("error" in result) { setError(result.error); } } catch (err) { setError(err instanceof Error ? err.message : "Couldn't revoke sessions"); } finally { setBusy(false); } }

  return (
    <div>
      <Link href="/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={14} /> All vendors</Link>
      {error && <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}</div>}
      {temporaryPassword && <div className="mb-4 rounded-[var(--radius-sm)] border border-[rgba(124,92,255,0.35)] bg-[var(--surface-hover)] px-4 py-3 text-sm text-[var(--text)]"><p className="font-semibold">Temporary password generated</p><p className="mt-1 text-xs text-[var(--text-muted)]">Give this password to the vendor admin directly. It is not stored in this UI.</p><code className="mt-2 block select-all rounded bg-black/10 px-3 py-2 font-mono text-sm">{temporaryPassword}</code></div>}

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}33, ${theme.accentTo}33)` }}>{theme.logoEmoji}</div><div><div className="flex items-center gap-2.5"><h1 className="font-display text-2xl font-semibold text-[var(--text)]">{vendor.name}</h1><VendorStatusBadge status={status} />{churnRisk.atRisk && <span title={churnRisk.reasons.join(" · ")}><Badge tone="danger" className="cursor-help"><TrendingDown size={11} /> Churn risk</Badge></span>}</div><a href={`https://${storefrontDomain}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-violet)]"><Globe size={13} /> {storefrontDomain} <ExternalLink size={12} /></a></div></div>
        <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => window.open(`https://${storefrontDomain}`, "_blank")}>View storefront</Button><Button variant="secondary" size="sm" onClick={() => window.open(`https://${adminDomain}`, "_blank")}>View vendor admin</Button></div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">{TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${tab === t ? "text-[var(--text)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"}`}>{t}{tab === t && <motion.div layoutId="vendor-tab-underline" className="absolute inset-x-0 -bottom-px h-0.5" style={{ background: "var(--accent-gradient)" }} />}</button>)}</div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card><p className="text-xs font-medium text-[var(--text-muted)]">Orders (30d)</p><p className="font-display mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--text)]"><ShoppingBag size={18} className="text-[var(--accent-violet)]" /> {vendor.orders_last_30d}</p></Card>
          <Card><p className="text-xs font-medium text-[var(--text-muted)]">Revenue (30d)</p><p className="font-display mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--text)]"><Wallet size={18} className="text-[var(--accent-amber)]" /> {formatPKR(vendor.revenue_last_30d)}</p></Card>
          <Card><p className="text-xs font-medium text-[var(--text-muted)]">Onboarded</p><p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{formatDate(vendor.joined_at)}</p></Card>
          <HealthScoreCard health={health} />
          <Card className="lg:col-span-3"><CardHeader title="Store details" /><dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[var(--text-faint)]">Category</dt><dd className="mt-1 flex flex-wrap items-center gap-2"><select value={categoryInput} onChange={e => setCategoryInput(e.target.value)} disabled={categoryBusy} className={inputClass + " max-w-[14rem]"}><option value="" disabled>Choose a category</option>{allCategories.map(c => <option key={c} value={c}>{c}</option>)}</select><Button variant="secondary" size="sm" onClick={saveCategory} disabled={categoryBusy || !categoryInput || categoryInput === vendor.category}>{categoryBusy ? "Saving…" : "Save"}</Button></dd><p className="mt-1 text-[11px] text-[var(--text-faint)]">Determines which product fields (box sizes, variants, etc.) this vendor&apos;s admin panel shows.</p></div><div><dt className="text-[var(--text-faint)]">City</dt><dd className="mt-0.5 text-[var(--text)]">{vendor.city}</dd></div><div className="sm:col-span-2"><dt className="text-[var(--text-faint)]">Custom domain</dt><div className="mt-1 flex flex-wrap items-center gap-2"><input value={customDomainInput} onChange={e => setCustomDomainInput(e.target.value.toLowerCase())} className={inputClass + " max-w-xl"} placeholder="shop.example.com" /><Button variant="secondary" size="sm" onClick={saveCustomDomain} disabled={customDomainBusy}>{customDomainBusy ? "Saving…" : "Save domain"}</Button></div><p className="mt-1 text-[11px] text-[var(--text-faint)]">DNS and Vercel verification are still required.</p></div></dl></Card>
          <Card className="lg:col-span-3"><CardHeader title="Super Admin control center" description="Platform-level fields are authoritative. Changes are audited." action={<Button variant="primary" size="sm" onClick={saveControlProfile} disabled={savingControl}>{savingControl ? "Saving…" : "Save controls"}</Button>} /><div className="grid gap-4 md:grid-cols-2"><label className="block md:col-span-2"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Store description</span><textarea value={control.description} onChange={e => setControl({ ...control, description: e.target.value })} className={inputClass + " min-h-24 resize-y"} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Contact email</span><input type="email" value={control.contactEmail} onChange={e => setControl({ ...control, contactEmail: e.target.value })} className={inputClass} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Contact phone</span><input value={control.contactPhone} onChange={e => setControl({ ...control, contactPhone: e.target.value })} className={inputClass} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Instagram URL</span><input value={control.instagramUrl} onChange={e => setControl({ ...control, instagramUrl: e.target.value })} className={inputClass} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">YouTube URL</span><input value={control.youtubeUrl} onChange={e => setControl({ ...control, youtubeUrl: e.target.value })} className={inputClass} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Fee type</span><select className={inputClass} value={control.feeType} onChange={e => setControl({ ...control, feeType: e.target.value as "percent" | "fixed" })}><option value="percent">Percentage of order</option><option value="fixed">Fixed amount per order</option></select></label>{control.feeType === "percent" ? <label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Platform fee (%)</span><input type="number" min="0" max="100" step="0.01" value={control.feeOverridePercent} onChange={e => setControl({ ...control, feeOverridePercent: e.target.value })} className={inputClass} placeholder="Blank = standard plan" /></label> : <label className="block"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Fixed fee per order (Rs)</span><input type="number" min="0" step="1" value={control.feeOverrideFixedAmount} onChange={e => setControl({ ...control, feeOverrideFixedAmount: e.target.value })} className={inputClass} placeholder="Blank = standard plan" /></label>}</div></Card>
          <Card className="lg:col-span-3"><CardHeader title="Store" description="Hostname routing for this vendor's storefront and admin login." /><div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[var(--text-faint)]">Store slug</dt>{editingSlug ? <div className="mt-1 flex items-center gap-2"><input value={slugInput} onChange={e => setSlugInput(e.target.value.toLowerCase())} className={inputClass} disabled={slugBusy} autoFocus /><Button variant="primary" size="sm" onClick={saveSlug} disabled={slugBusy}>{slugBusy ? "Saving…" : "Save"}</Button><Button variant="secondary" size="sm" onClick={() => { setEditingSlug(false); setSlugInput(vendor.subdomain); }} disabled={slugBusy}>Cancel</Button></div> : <dd className="mt-0.5 flex items-center gap-2 text-[var(--text)]">{vendor.subdomain}<button type="button" onClick={() => setEditingSlug(true)} className="text-xs font-medium text-[var(--accent-violet)] hover:underline">Edit</button></dd>}</div><div><dt className="text-[var(--text-faint)]">Status</dt><dd className="mt-0.5"><VendorStatusBadge status={status} /></dd></div><div><dt className="text-[var(--text-faint)]">Storefront domain</dt><dd className="mt-0.5 flex items-center gap-1.5 text-[var(--text)]">{storefrontDomain}<a href={`https://${storefrontDomain}`} target="_blank" rel="noreferrer" className="text-[var(--accent-violet)]"><ExternalLink size={12} /></a></dd></div><div><dt className="text-[var(--text-faint)]">Admin domain</dt><dd className="mt-0.5 flex items-center gap-1.5 text-[var(--text)]">{adminDomain}<a href={`https://${adminDomain}`} target="_blank" rel="noreferrer" className="text-[var(--accent-violet)]"><ExternalLink size={12} /></a></dd></div></div><div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4"><Button variant="secondary" size="sm" onClick={() => window.open(`https://${storefrontDomain}`, "_blank")}><Globe size={13} /> View storefront</Button><Button variant="secondary" size="sm" onClick={() => window.open(`https://${adminDomain}`, "_blank")}><Globe size={13} /> View vendor admin</Button></div></Card>
          <Card><p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"><Sparkles size={13} className="text-[var(--accent-violet)]" /> AI Assistant</p><div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--success)]" /><p className="text-sm font-semibold text-[var(--text)]">Enabled, scoped to {vendor.name}</p></div></Card>
          {categorySchema && <Card className="lg:col-span-2"><p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"><Layers size={13} /> Product settings ({vendor.category})</p><p className="mt-1.5 text-xs text-[var(--text-faint)]">{categorySchema.note}</p><div className="mt-3 flex flex-wrap gap-1.5">{categorySchema.fields.map(f => <span key={f} className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]">{f}</span>)}</div></Card>}
        </div>
      )}

      {tab === "Branding & Theme" && <Card><CardHeader title="Storefront theme" action={<Button variant="primary" size="sm" onClick={saveTheme} disabled={savingTheme}>{saved ? "Saved ✓" : savingTheme ? "Saving…" : "Save changes"}</Button>} /><div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]"><div className="space-y-5"><div className="grid grid-cols-2 gap-4"><label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Accent — from</span><input type="color" value={theme.accentFrom} onChange={e => setTheme({ ...theme, accentFrom: e.target.value })} className="h-10 w-16 cursor-pointer" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Accent — to</span><input type="color" value={theme.accentTo} onChange={e => setTheme({ ...theme, accentTo: e.target.value })} className="h-10 w-16 cursor-pointer" /></label></div><div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-[var(--text-muted)]">Store logo / 3D mark</p><p className="mt-1 text-[11px] text-[var(--text-faint)]">Upload the vendor&apos;s real logo.</p></div><label className="cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)]">{uploadingLogo ? "Uploading…" : theme.logoUrl ? "Replace" : "Upload"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => uploadLogo(e.target.files?.[0])} disabled={uploadingLogo} /></label></div>{theme.logoUrl && <img src={theme.logoUrl} alt={`${vendor.name} logo`} className="mt-3 h-16 w-16 rounded-2xl border border-[var(--border)] bg-white object-contain p-2 shadow-sm" />}</div><label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Logo emoji</span><input value={theme.logoEmoji} onChange={e => setTheme({ ...theme, logoEmoji: e.target.value })} maxLength={2} className="w-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-lg outline-none" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Typeface</span><div className="flex flex-wrap gap-2">{FONT_OPTIONS.map(f => <button type="button" key={f} onClick={() => setTheme({ ...theme, font: f })} className="rounded-[var(--radius-sm)] border px-3 py-2 text-sm" style={theme.font === f ? { background: "var(--accent-gradient-soft)", borderColor: "var(--accent-violet)" } : undefined}>{f}</button>)}</div></label></div><div><p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Live preview</p><div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]"><div className="flex h-24 items-center justify-center text-3xl" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>{theme.logoUrl ? <img src={theme.logoUrl} alt="Store logo" className="h-16 w-16 rounded-2xl bg-white/90 object-contain p-2 shadow-lg" /> : theme.logoEmoji}</div><div className="space-y-2 bg-[var(--surface-solid)] p-4"><p className="text-sm font-semibold text-[var(--text)]">{vendor.name}</p><div className="inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>Shop now</div></div></div></div></div></Card>}

      {tab === "Admins & Access" && <Card><CardHeader title="Store admins" description="Accounts with access to this vendor&apos;s own admin panel." action={<Button variant="primary" size="sm" onClick={() => setAddingAdmin(v => !v)}><UserPlus size={14} /> Add admin</Button>} />{addingAdmin && <form onSubmit={addAdmin} className="mb-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3"><label className="block min-w-[10rem] flex-1"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Name</span><input required value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className={inputClass} /></label><label className="block min-w-[10rem] flex-1"><span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Email</span><input required type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className={inputClass} /></label><Button type="submit" variant="primary" size="sm" disabled={busy}>Add</Button></form>}<div className="divide-y divide-[var(--border)]">{admins.map(admin => <div key={admin.id} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text)]">{admin.name.split(" ").map(p => p[0]).join("").slice(0,2)}</div><div><p className="text-sm font-medium text-[var(--text)]">{admin.name}</p><p className="text-xs text-[var(--text-faint)]">{admin.email}</p></div></div><div className="flex items-center gap-3"><Badge tone={admin.role === "owner" ? "violet" : "neutral"}>{admin.role}</Badge><button onClick={() => revokeSessions(admin)} disabled={busy} className="text-[var(--text-faint)] hover:text-[var(--warning)]" title="Revoke all active sessions"><HeartPulse size={15} /></button><button onClick={() => sendAdminReset(admin)} disabled={busy} className="text-[var(--text-faint)] hover:text-[var(--text)]" title="Generate a temporary password">Reset</button><button onClick={() => { setEditingAdminId(admin.id); setEditAdminName(admin.name); setEditAdminEmail(admin.email); setEditAdminPassword(""); setTemporaryPassword(null); }} disabled={busy} className="text-[var(--text-faint)] hover:text-[var(--accent-violet)]" title="Edit login credentials"><Pencil size={15} /></button>{admin.role !== "owner" && <button onClick={() => removeAdmin(admin.id)} disabled={busy} className="text-[var(--text-faint)] hover:text-[var(--danger)]" title="Remove admin"><Trash2 size={15} /></button>}</div></div>)}{admins.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">No admins yet.</p>}</div>{editingAdminId && <form onSubmit={saveAdminCredentials} className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-hover)] p-4"><p className="mb-3 text-sm font-semibold text-[var(--text)]">Change admin login credentials</p><div className="grid gap-3 md:grid-cols-3"><input required value={editAdminName} onChange={e => setEditAdminName(e.target.value)} className={inputClass} placeholder="Name" /><input required type="email" value={editAdminEmail} onChange={e => setEditAdminEmail(e.target.value)} className={inputClass} placeholder="Login email" /><input minLength={10} type="password" value={editAdminPassword} onChange={e => setEditAdminPassword(e.target.value)} className={inputClass} placeholder="New password (optional)" /></div><p className="mt-2 text-xs text-[var(--text-faint)]">Leave password blank to keep it unchanged. A new password replaces the current login password immediately.</p><div className="mt-3 flex gap-2"><Button type="submit" variant="primary" size="sm" disabled={busy}>Save credentials</Button><Button type="button" variant="secondary" size="sm" onClick={() => setEditingAdminId(null)}>Cancel</Button></div></form>}</Card>}

      {tab === "Billing" && <Card><CardHeader title="Pricing plan" /><div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4"><div><p className="text-sm font-medium text-[var(--text)]">{PLAN_LABEL[plan]}</p><p className="mt-0.5 text-xs text-[var(--text-faint)]">{plan === "per_order" ? "Customer pays the platform fee at checkout." : "Vendor pays a flat monthly fee."}</p></div><Button variant="secondary" size="sm" onClick={changePlan} disabled={busy}>Change plan</Button></div></Card>}
      {tab === "Billing" && <Card className="mt-4"><CardHeader title="Display currency" /><div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4"><p className="text-sm font-medium text-[var(--text)]">{vendor.currency}</p><select value={vendor.currency} onChange={e => changeCurrency(e.target.value)} disabled={currencyBusy} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] outline-none">{CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div></Card>}
      {tab === "Billing" && <Card className="mt-4"><CardHeader title="White-label" /><div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4"><div><p className="text-sm font-medium text-[var(--text)]">{vendor.white_label_enabled ? "White-label enabled" : "White-label disabled"}</p></div><Button variant={vendor.white_label_enabled ? "danger" : "primary"} size="sm" onClick={toggleWhiteLabel} disabled={!isFinanceStaff || whiteLabelBusy}>{whiteLabelBusy ? "Saving…" : vendor.white_label_enabled ? "Disable" : "Enable"}</Button></div></Card>}
      {tab === "Danger Zone" && <Card className="border-[rgba(251,113,133,0.25)]"><CardHeader title="Danger zone" /><div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4"><div className="flex items-center gap-3"><AlertTriangle size={17} className="text-[var(--warning)]" /><div><p className="text-sm font-medium text-[var(--text)]">{status === "suspended" ? "Reactivate this store" : "Suspend this store"}</p><p className="text-xs text-[var(--text-faint)]">{status === "suspended" ? "Restores the storefront and admin panel access." : "Storefront goes offline. Data is preserved."}</p></div></div><Button variant={status === "suspended" ? "primary" : "danger"} size="sm" onClick={toggleStatus} disabled={busy}>{status === "suspended" ? "Reactivate" : "Suspend"}</Button></div></Card>}
    </div>
  );
}

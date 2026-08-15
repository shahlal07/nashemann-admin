"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Globe2, Store } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export type DiscountType = "percent" | "fixed" | "free_shipping";
export type CouponScope = "universal" | "vendor";

export type CouponRow = {
  id: string;
  code: string;
  scope: CouponScope;
  vendor_id: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type VendorLite = { id: string; name: string };

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

function discountLabel(c: CouponRow) {
  if (c.discount_type === "percent") return `${c.discount_value}% off`;
  if (c.discount_type === "fixed") return `Rs ${c.discount_value} off`;
  return "Free shipping";
}

export function CouponsClient({
  initialCoupons,
  vendors,
}: {
  initialCoupons: CouponRow[];
  vendors: VendorLite[];
}) {
  const supabase = createClient();
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [scope, setScope] = useState<CouponScope>("universal");
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [maxUses, setMaxUses] = useState<number | "">("");

  function vendorName(id: string | null) {
    if (!id) return null;
    return vendors.find((v) => v.id === id)?.name ?? "Unknown vendor";
  }

  function resetForm() {
    setCode("");
    setScope("universal");
    setDiscountType("percent");
    setDiscountValue(10);
    setMinOrderAmount(0);
    setMaxUses("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: code.toUpperCase().trim(),
        scope,
        vendor_id: scope === "universal" ? null : vendorId,
        discount_type: discountType,
        discount_value: discountType === "free_shipping" ? 0 : discountValue,
        min_order_amount: minOrderAmount,
        max_uses: maxUses === "" ? null : Number(maxUses),
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      alert(error?.message ?? "Couldn't create the coupon.");
      return;
    }
    setCoupons((prev) => [data as CouponRow, ...prev]);
    resetForm();
    setCreating(false);
  }

  async function toggleActive(c: CouponRow) {
    const nextActive = !c.active;
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: nextActive } : x)));
    const { error } = await supabase.from("coupons").update({ active: nextActive }).eq("id", c.id);
    if (error) {
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)));
      alert(error.message);
    }
  }

  async function remove(c: CouponRow) {
    if (c.used_count > 0) {
      alert("This coupon has already been used on orders — deactivate it instead of deleting.");
      return;
    }
    const prevCoupons = coupons;
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) {
      setCoupons(prevCoupons);
      alert(error.message);
    }
  }

  const universalCount = coupons.filter((c) => c.scope === "universal").length;

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Universal coupons work at checkout on every vendor storefront. Vendor coupons are scoped to one store only."
        action={
          <Button variant="primary" onClick={() => setCreating((v) => !v)}>
            <Plus size={16} /> New coupon
          </Button>
        }
      />

      {creating && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card>
            <CardHeader title="Create coupon" />
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <span className={labelClass}>Scope</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setScope("universal")}
                    className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left transition-colors ${
                      scope === "universal" ? "border-[var(--accent-violet)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                    style={scope === "universal" ? { background: "var(--accent-gradient-soft)" } : undefined}
                  >
                    <Globe2 size={18} className="mt-0.5 shrink-0 text-[var(--accent-violet)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Universal</p>
                      <p className="mt-0.5 text-xs text-[var(--text-faint)]">Valid at checkout on every vendor&apos;s storefront.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("vendor")}
                    className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left transition-colors ${
                      scope === "vendor" ? "border-[var(--accent-violet)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                    style={scope === "vendor" ? { background: "var(--accent-gradient-soft)" } : undefined}
                  >
                    <Store size={18} className="mt-0.5 shrink-0 text-[var(--accent-violet)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Single vendor</p>
                      <p className="mt-0.5 text-xs text-[var(--text-faint)]">Valid on one store&apos;s storefront only.</p>
                    </div>
                  </button>
                </div>
              </div>

              {scope === "vendor" && (
                <label className="block">
                  <span className={labelClass}>Vendor</span>
                  <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Code</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    placeholder="NASHEMANN10"
                    className={`${inputClass} font-mono uppercase`}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Discount type</span>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className={inputClass}>
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed amount (Rs)</option>
                    <option value="free_shipping">Free shipping</option>
                  </select>
                </label>
                {discountType !== "free_shipping" && (
                  <label className="block">
                    <span className={labelClass}>{discountType === "percent" ? "Percent off" : "Amount off (Rs)"}</span>
                    <input
                      type="number"
                      min={0}
                      max={discountType === "percent" ? 100 : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className={inputClass}
                    />
                  </label>
                )}
                <label className="block">
                  <span className={labelClass}>Minimum order (Rs)</span>
                  <input type="number" min={0} value={minOrderAmount} onChange={(e) => setMinOrderAmount(Number(e.target.value))} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Max uses (blank = unlimited)</span>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Creating…" : "Create coupon"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <div className="mb-4 flex items-center gap-2 text-xs text-[var(--text-faint)]">
        <Globe2 size={13} className="text-[var(--accent-violet)]" /> {universalCount} universal coupon{universalCount === 1 ? "" : "s"} active platform-wide
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Scope</th>
                <th className="pb-3 pr-4">Discount</th>
                <th className="pb-3 pr-4">Min. order</th>
                <th className="pb-3 pr-4">Usage</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 pr-4 font-mono font-semibold text-[var(--text)]">{c.code}</td>
                  <td className="py-3 pr-4">
                    {c.scope === "universal" ? (
                      <Badge tone="violet">Universal</Badge>
                    ) : (
                      <Badge tone="neutral">{vendorName(c.vendor_id)}</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[var(--text)]">{discountLabel(c)}</td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">Rs {c.min_order_amount.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">
                    {c.used_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="py-3 pr-4">
                    <button onClick={() => toggleActive(c)}>
                      <Badge tone={c.active ? "success" : "neutral"} dot>
                        {c.active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => remove(c)} className="text-[var(--text-faint)] hover:text-[var(--danger)]" aria-label="Delete coupon">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-faint)]">
                    No coupons yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

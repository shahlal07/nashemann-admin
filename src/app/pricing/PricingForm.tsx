"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPKR } from "@/lib/utils";
import { Check } from "lucide-react";
import { savePricingAction } from "./actions";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export type PricingValue = {
  perOrderFee: number;
  monthlyFee: number;
  customDomainFee: number;
};

export type FeeModeValue = {
  feeType: "percent" | "fixed";
  feePercent: number;
  feeFixedAmount: number;
};

export function PricingForm({ initialPricing, initialFeeMode }: { initialPricing: PricingValue; initialFeeMode: FeeModeValue }) {
  const [pricing, setPricing] = useState(initialPricing);
  const [feeMode, setFeeMode] = useState(initialFeeMode);
  const [perOrderEnabled, setPerOrderEnabled] = useState(true);
  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const breakEven = Math.ceil(pricing.monthlyFee / pricing.perOrderFee);

  function save() {
    startTransition(async () => {
      await savePricingAction({ ...pricing, feeType: feeMode.feeType, feePercent: feeMode.feePercent, feeFixedAmount: feeMode.feeFixedAmount });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text)]">Pricing plans</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-muted)]">
            The two ways a vendor pays for Nashemann. Changes apply to new orders/invoices going forward — never
            rewrites history.
          </p>
        </div>
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save pricing"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={!perOrderEnabled ? "opacity-60" : undefined}>
          <div className="mb-4 flex items-center justify-between">
            <CardHeader title="Pay Per Order" description="No monthly bill — the customer covers the fee at checkout." />
            <button
              onClick={() => setPerOrderEnabled((v) => !v)}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${perOrderEnabled ? "" : "bg-white/10"}`}
              style={perOrderEnabled ? { background: "var(--accent-gradient)" } : undefined}
              aria-label="Toggle Pay Per Order plan"
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${perOrderEnabled ? "translate-x-[22px]" : ""}`}
              />
            </button>
          </div>

          <label className="block">
            <span className={labelClass}>Fee per order (Rs)</span>
            <input
              type="number"
              min={1}
              value={pricing.perOrderFee}
              onChange={(e) => setPricing({ ...pricing, perOrderFee: Number(e.target.value) })}
              className={inputClass}
            />
          </label>

          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[var(--success)]" /> Best for new & untested businesses
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[var(--success)]" /> Zero upfront cost to the vendor
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[var(--success)]" /> Break-even vs monthly at {breakEven.toLocaleString()} orders/mo
            </li>
          </ul>
        </Card>

        <Card className={!monthlyEnabled ? "opacity-60" : undefined}>
          <div className="mb-4 flex items-center justify-between">
            <CardHeader title="Monthly" description="Flat fee, unlimited orders — for established vendors." />
            <button
              onClick={() => setMonthlyEnabled((v) => !v)}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${monthlyEnabled ? "" : "bg-white/10"}`}
              style={monthlyEnabled ? { background: "var(--accent-gradient)" } : undefined}
              aria-label="Toggle Monthly plan"
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${monthlyEnabled ? "translate-x-[22px]" : ""}`}
              />
            </button>
          </div>

          <label className="block">
            <span className={labelClass}>Monthly fee (Rs)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={pricing.monthlyFee}
              onChange={(e) => setPricing({ ...pricing, monthlyFee: Number(e.target.value) })}
              className={inputClass}
            />
          </label>

          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[var(--success)]" /> Best above ~{breakEven.toLocaleString()} orders/month
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[var(--success)]" /> Predictable cost regardless of volume
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[var(--success)]" /> No per-order fee shown to their customers
            </li>
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Checkout platform fee" description="The fee charged to the customer per order. This is independent of the per-order/monthly plan and is always applied." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Fee type</span>
              <select className={inputClass} value={feeMode.feeType} onChange={(e) => setFeeMode({ ...feeMode, feeType: e.target.value as "percent" | "fixed" })}>
                <option value="percent">Percentage of order subtotal</option>
                <option value="fixed">Fixed amount per order</option>
              </select>
            </label>
            {feeMode.feeType === "percent" ? (
              <label className="block">
                <span className={labelClass}>Default fee (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={feeMode.feePercent} onChange={(e) => setFeeMode({ ...feeMode, feePercent: Number(e.target.value) })} className={inputClass} />
              </label>
            ) : (
              <label className="block">
                <span className={labelClass}>Default fee per order (Rs)</span>
                <input type="number" min="0" step="1" value={feeMode.feeFixedAmount} onChange={(e) => setFeeMode({ ...feeMode, feeFixedAmount: Number(e.target.value) })} className={inputClass} />
              </label>
            )}
          </div>
          <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-xs text-[var(--text-faint)]">
            Per-vendor overrides can be set on each vendor&apos;s detail page. Vendor coupons/promo codes cannot reduce the platform fee.
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Custom domain add-on" description="One-time fee, either plan." />
          <div className="flex items-center gap-4">
            <label className="block">
              <span className={labelClass}>One-time fee (Rs)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={pricing.customDomainFee}
                onChange={(e) => setPricing({ ...pricing, customDomainFee: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
            <div className="pt-5">
              <Badge tone="violet">e.g. sabzbasket.pk instead of sabz-basket.nashemann.store</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="What vendors see on the apply page" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-faint)]">Pay Per Order</p>
            <p className="font-display mt-1 text-xl font-semibold text-[var(--text)]">{formatPKR(pricing.perOrderFee)}</p>
            <p className="text-xs text-[var(--text-faint)]">per order</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-faint)]">Monthly</p>
            <p className="font-display mt-1 text-xl font-semibold text-[var(--text)]">{formatPKR(pricing.monthlyFee)}</p>
            <p className="text-xs text-[var(--text-faint)]">per month</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-faint)]">Custom domain</p>
            <p className="font-display mt-1 text-xl font-semibold text-[var(--text)]">{formatPKR(pricing.customDomainFee)}</p>
            <p className="text-xs text-[var(--text-faint)]">one-time</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export function SettingsForm() {
  const [saved, setSaved] = useState(false);
  function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div>
      <PageHeader title="Platform settings" description="Nashemann's own identity — separate from any single vendor's branding." />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Platform identity" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Platform name</span>
              <input defaultValue="Nashemann" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Support email</span>
              <input defaultValue="hello@nashemann.com" type="email" className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Tagline</span>
              <input defaultValue="The infrastructure behind independent online stores." className={inputClass} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Application defaults" description="Rules applied to every new vendor application." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Auto-review SLA (hours)</span>
              <input type="number" defaultValue={24} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Default plan for new applicants</span>
              <select defaultValue="per_order" className={inputClass}>
                <option value="per_order">Pay Per Order</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Danger zone" description="Platform-wide, not vendor-specific." />
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[rgba(251,113,133,0.25)] bg-[var(--danger-bg)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Pause new applications</p>
              <p className="text-xs text-[var(--text-faint)]">Hides the /apply page while you&apos;re at capacity.</p>
            </div>
            <Button type="button" variant="danger" size="sm">
              Pause applications
            </Button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary">
            {saved ? "Saved ✓" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

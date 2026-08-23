"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveSettingsAction, setApplicationsPausedAction } from "./actions";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export type SettingsValue = {
  platformName: string;
  supportEmail: string;
  tagline: string;
  applicationSlaHours: number;
  defaultApplicantPlan: "per_order" | "monthly";
  applicationsPaused: boolean;
};

export function SettingsForm({ initialSettings }: { initialSettings: SettingsValue }) {
  const [values, setValues] = useState(initialSettings);
  const [applicationsPaused, setApplicationsPausedState] = useState(initialSettings.applicationsPaused);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pauseBusy, setPauseBusy] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveSettingsAction({
          platformName: values.platformName,
          supportEmail: values.supportEmail,
          tagline: values.tagline,
          applicationSlaHours: values.applicationSlaHours,
          defaultApplicantPlan: values.defaultApplicantPlan,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save settings.");
      }
    });
  }

  async function togglePauseApplications() {
    setPauseBusy(true);
    setPauseError(null);
    const next = !applicationsPaused;
    try {
      await setApplicationsPausedAction(next);
      setApplicationsPausedState(next);
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : "Couldn't update application status.");
    } finally {
      setPauseBusy(false);
    }
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
              <input value={values.platformName} onChange={(e) => setValues({ ...values, platformName: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Support email</span>
              <input value={values.supportEmail} onChange={(e) => setValues({ ...values, supportEmail: e.target.value })} type="email" className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Tagline</span>
              <input value={values.tagline} onChange={(e) => setValues({ ...values, tagline: e.target.value })} className={inputClass} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Application defaults" description="Rules applied to every new vendor application." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Auto-review SLA (hours)</span>
              <input
                type="number"
                min={1}
                value={values.applicationSlaHours}
                onChange={(e) => setValues({ ...values, applicationSlaHours: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Default plan for new applicants</span>
              <select
                value={values.defaultApplicantPlan}
                onChange={(e) => setValues({ ...values, defaultApplicantPlan: e.target.value as "per_order" | "monthly" })}
                className={inputClass}
              >
                <option value="per_order">Pay Per Order</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </Card>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
          </Button>
        </div>
      </form>

      <Card className="mt-4">
        <CardHeader title="Danger zone" description="Platform-wide, not vendor-specific." />
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[rgba(251,113,133,0.25)] bg-[var(--danger-bg)] p-4">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{applicationsPaused ? "New applications are paused" : "Pause new applications"}</p>
            <p className="text-xs text-[var(--text-faint)]">Hides the /apply page while you&apos;re at capacity.</p>
            {pauseError && <p className="mt-1 text-xs text-[var(--danger)]">{pauseError}</p>}
          </div>
          <Button type="button" variant="danger" size="sm" onClick={togglePauseApplications} disabled={pauseBusy}>
            {pauseBusy ? "Working…" : applicationsPaused ? "Resume applications" : "Pause applications"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

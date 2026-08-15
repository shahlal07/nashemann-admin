"use client";

/**
 * Frontend-only persistence for the demo: bug reports submitted from the
 * public /report-bug form land here so the super-admin Bug Reports page can
 * actually see them (and their attached screenshot) instead of only ever
 * showing the static seed data.
 */

import { MOCK_BUG_REPORTS, type BugReport } from "./mock-data";

const KEY = "nashemann_bug_reports";

function readExtra(): BugReport[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BugReport[];
  } catch {
    return [];
  }
}

function writeExtra(reports: BugReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(reports));
}

export function getAllBugReports(): BugReport[] {
  return [...readExtra(), ...MOCK_BUG_REPORTS];
}

export function submitBugReport(input: {
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  screenshotUrl: string | null;
}): BugReport {
  const report: BugReport = {
    id: `b${Date.now()}`,
    title: input.title,
    description: input.description,
    status: "pending",
    adminNote: null,
    rewardGranted: false,
    reporterName: input.reporterName || "Anonymous",
    reporterEmail: input.reporterEmail || "—",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    screenshotUrl: input.screenshotUrl,
  };
  const extra = readExtra();
  extra.unshift(report);
  writeExtra(extra);
  return report;
}

export function updateBugReport(id: string, patch: Partial<BugReport>) {
  const extra = readExtra();
  const idx = extra.findIndex((r) => r.id === id);
  if (idx === -1) return; // seed data isn't persisted -- edits to it stay session-local in the page itself
  extra[idx] = { ...extra[idx], ...patch };
  writeExtra(extra);
}

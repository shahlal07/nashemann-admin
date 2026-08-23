"use client";

/**
 * Frontend-only persistence for the demo: submitted applications live in
 * localStorage so /apply/track has something real to look up. Stands in
 * for a real `vendor_applications` table + email-lookup query.
 */

export type StoredApplication = {
  referenceId: string;
  businessName: string;
  ownerEmail: string;
  city: string;
  plan: "per_order" | "monthly";
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  referralCode?: string;
};

const KEY = "nashemann_applications";

const SEED: StoredApplication[] = [
  {
    referenceId: "NSH-DEMO01",
    businessName: "Kohsar Organics",
    ownerEmail: "ayesha@kohsarorganics.pk",
    city: "Islamabad",
    plan: "per_order",
    status: "pending",
    submittedAt: "2026-08-14T09:12:00Z",
  },
];

export function getApplications(): StoredApplication[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return SEED;
  try {
    return [...SEED, ...(JSON.parse(raw) as StoredApplication[])];
  } catch {
    return SEED;
  }
}

export function saveApplication(app: Omit<StoredApplication, "referenceId" | "status" | "submittedAt">): StoredApplication {
  const referenceId = "NSH-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const record: StoredApplication = { ...app, referenceId, status: "pending", submittedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    const existing = window.localStorage.getItem(KEY);
    const list: StoredApplication[] = existing ? JSON.parse(existing) : [];
    list.unshift(record);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  }
  return record;
}

export function findApplication(query: string): StoredApplication | null {
  const q = query.trim().toLowerCase();
  return getApplications().find((a) => a.referenceId.toLowerCase() === q || a.ownerEmail.toLowerCase() === q) ?? null;
}

/**
 * A vendor filling out /apply without a Nashemann platform account gets sent
 * to sign up first (checkout.js-style gate from vendor-storefronts) -- their
 * in-progress form is stashed here so /apply can restore it and let them
 * finish with a single click once they're signed in.
 */
export type PendingApplication = {
  businessName: string;
  category: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  subdomain: string;
  plan: "per_order" | "monthly";
  message: string;
  referralCode?: string;
};

/** Applications submitted with `?ref=<code>` on /apply, for an influencer's "who joined via my link" view. */
export function getApplicationsByReferralCode(code: string): StoredApplication[] {
  return getApplications().filter((a) => a.referralCode?.toUpperCase() === code.toUpperCase());
}

const PENDING_KEY = "nashemann_pending_application";

export function savePendingApplication(draft: PendingApplication) {
  if (typeof window !== "undefined") window.localStorage.setItem(PENDING_KEY, JSON.stringify(draft));
}

export function getPendingApplication(): PendingApplication | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingApplication;
  } catch {
    return null;
  }
}

export function clearPendingApplication() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_KEY);
}

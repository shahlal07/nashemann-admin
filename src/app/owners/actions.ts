/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this repository yet; query boundaries are guarded by server authorization and database RLS. */
"use server";

import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/founders/authz";
import { FOUNDER_RESPONSIBILITIES, type FounderResponsibility } from "@/lib/founders/capabilities";

const DOMAIN_SET = new Set<string>(FOUNDER_RESPONSIBILITIES);

function cleanText(value: unknown, field: string, min: number, max: number) {
  const text = String(value ?? "").trim();
  if (text.length < min || text.length > max) throw new Error(`${field} must be between ${min} and ${max} characters.`);
  return text;
}

function cleanDomain(value: unknown): FounderResponsibility {
  const domain = String(value ?? "");
  if (!DOMAIN_SET.has(domain)) throw new Error("Select a valid owner domain.");
  return domain as FounderResponsibility;
}

function managementCapability(domain: FounderResponsibility) {
  if (domain === "product_technology") return "technology.manage" as const;
  if (domain === "business_strategy") return "strategy.manage" as const;
  return "governance.manage" as const;
}

export async function createOwnerDecisionAction(input: {
  title: string;
  summary: string;
  domain: string;
}) {
  const domain = cleanDomain(input.domain);
  const title = cleanText(input.title, "Title", 3, 240);
  const summary = String(input.summary ?? "").trim();
  if (summary.length > 5000) throw new Error("Summary must be 5,000 characters or fewer.");

  const { supabase, user, membership } = await requireFounder(managementCapability(domain));
  if (!membership.responsibilities.includes(domain)) throw new Error("Your owner membership is not assigned to this domain.");

  const { error } = await (supabase.from("owner_decisions") as any).insert({
    title,
    summary: summary || null,
    domain,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/owners");
  revalidatePath("/owners/decisions");
  revalidatePath("/owners/strategy");
  revalidatePath("/owners/technology");
  return { ok: true };
}

export async function updateOwnerDecisionAction(input: {
  id: string;
  title: string;
  summary: string;
  status: "proposed" | "approved" | "rejected" | "archived";
}) {
  const id = cleanText(input.id, "Decision id", 36, 36);
  const title = cleanText(input.title, "Title", 3, 240);
  const summary = String(input.summary ?? "").trim();
  if (summary.length > 5000) throw new Error("Summary must be 5,000 characters or fewer.");
  if (!["proposed", "approved", "rejected", "archived"].includes(input.status)) throw new Error("Invalid decision status.");

  const { supabase: readClient } = await requireFounder();
  const { data: existing, error: readError } = await (readClient.from("owner_decisions") as any)
    .select("domain")
    .eq("id", id)
    .maybeSingle();
  if (readError || !existing) throw new Error(readError?.message ?? "Decision not found or outside your assigned domain.");

  const domain = cleanDomain(existing.domain);
  const { supabase, membership } = await requireFounder(managementCapability(domain), domain);
  if (!membership.responsibilities.includes(domain)) throw new Error("Your owner membership is not assigned to this domain.");
  const { error } = await (supabase.from("owner_decisions") as any)
    .update({ title, summary: summary || null, status: input.status })
    .eq("id", id)
    .eq("domain", domain);
  if (error) throw new Error(error.message);

  revalidatePath("/owners");
  revalidatePath("/owners/decisions");
  revalidatePath("/owners/strategy");
  revalidatePath("/owners/technology");
  return { ok: true };
}

export async function createOwnerApprovalAction(input: {
  title: string;
  description: string;
  domain: string;
}) {
  const domain = cleanDomain(input.domain);
  const title = cleanText(input.title, "Title", 3, 240);
  const description = String(input.description ?? "").trim();
  if (description.length > 5000) throw new Error("Description must be 5,000 characters or fewer.");

  const { supabase, user, membership } = await requireFounder("approvals.request");
  if (!membership.responsibilities.includes(domain)) throw new Error("Your owner membership is not assigned to this domain.");

  const { error } = await (supabase.from("owner_approvals") as any).insert({
    title,
    description: description || null,
    domain,
    requested_by: user.id,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/owners");
  revalidatePath("/owners/approvals");
  return { ok: true };
}

export async function reviewOwnerApprovalAction(input: {
  id: string;
  status: "approved" | "rejected";
  reason: string;
}) {
  const id = cleanText(input.id, "Approval id", 36, 36);
  const reason = cleanText(input.reason, "Decision reason", 3, 2000);
  if (!["approved", "rejected"].includes(input.status)) throw new Error("Choose approve or reject.");

  const { supabase, user } = await requireFounder("approvals.review");
  const { data, error } = await (supabase.from("owner_approvals") as any)
    .update({
      status: input.status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      decision_reason: reason,
    })
    .eq("id", id)
    .eq("status", "pending")
    .neq("requested_by", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("This request is no longer pending, is your own request, or is outside your assigned domain.");

  revalidatePath("/owners");
  revalidatePath("/owners/approvals");
  return { ok: true };
}

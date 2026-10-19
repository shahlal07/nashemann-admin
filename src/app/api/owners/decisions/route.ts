import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_NEW_DECISION_STATUSES, canCreateDecisionInDomain } from "@/lib/founders/decision-rules";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ALLOWED_NEW_DECISION_STATUSES;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in to record a decision." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("owner_memberships")
    .select("user_id, status, responsibilities, capabilities")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (membershipError || !membership || membership.status !== "active") {
    return NextResponse.json({ error: "Active co-founder workspace access is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid decision payload." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const domain = typeof payload.domain === "string" ? payload.domain : "";
  if (!canCreateDecisionInDomain(membership, domain)) {
    return NextResponse.json({ error: "You can only create decisions in the product-technology or business-strategy domain, and your account does not have permission for this domain." }, { status: 403 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const summary = payload.summary == null ? null : typeof payload.summary === "string" ? payload.summary.trim() : undefined;
  const status = typeof payload.status === "string" ? payload.status : "proposed";

  if (title.length < 3 || title.length > 240) {
    return NextResponse.json({ error: "Title must be between 3 and 240 characters." }, { status: 400 });
  }
  if (summary === undefined || (summary !== null && summary.length > 5000)) {
    return NextResponse.json({ error: "Summary must be text of up to 5,000 characters." }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "New decisions must start as proposed. Approval and rejection are handled through governance review." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("owner_decisions")
    .insert({
      title,
      summary,
      domain,
      status: "proposed",
      created_by: authData.user.id,
    })
    .select("id, title, summary, domain, status, created_at")
    .single();

  if (error) {
    console.error("Failed to create owner decision:", error.message);
    return NextResponse.json({ error: "Could not save the decision. Check that the owner-governance migration is deployed and your account has permission." }, { status: 500 });
  }

  return NextResponse.json({ decision: data }, { status: 201 });
}

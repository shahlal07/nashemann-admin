/**
 * Founder workspace permissions are independent of staff roles.
 * Never use a UI label or a client-supplied capability list as authorization.
 */
export const FOUNDER_CAPABILITIES = [
  "workspace.read",
  "governance.read",
  "governance.manage",
  "approvals.read",
  "approvals.request",
  "approvals.review",
  "finance.read",
  "finance.manage",
  "technology.read",
  "technology.manage",
  "strategy.read",
  "strategy.manage",
  "members.manage",
  "audit.read",
] as const;

export type FounderCapability = (typeof FOUNDER_CAPABILITIES)[number];

export const FOUNDER_RESPONSIBILITIES = [
  "shared_governance",
  "finance_governance",
  "product_technology",
  "business_strategy",
  "operations",
] as const;

export type FounderResponsibility = (typeof FOUNDER_RESPONSIBILITIES)[number];

export type FounderMembership = {
  user_id: string;
  display_name: string | null;
  status: "pending" | "active" | "suspended";
  responsibilities: FounderResponsibility[];
  capabilities: FounderCapability[];
};

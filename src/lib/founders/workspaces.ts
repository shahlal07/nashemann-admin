import type { FounderCapability, FounderResponsibility } from "./capabilities";

/**
 * Founder workspace model (V5 integration).
 *
 * Nashemann has three founders, each owning one workspace:
 *   - Technology → responsibility "product_technology",  technology.read / technology.manage
 *   - Finance    → responsibility "finance_governance",  finance.read    / finance.manage
 *   - Marketing  → responsibility "business_strategy",   strategy.read   / strategy.manage
 *
 * The Marketing workspace intentionally reuses the existing `business_strategy`
 * domain and `strategy.*` capabilities: the live owner_memberships records map
 * the third founder ("Marketing Owner") to business_strategy + strategy.*, so no
 * schema change is required to represent workspace ownership.
 *
 * Access rules (enforced server-side; the UI only mirrors them):
 *   - Any ACTIVE founder may open every workspace in read-only preview.
 *   - Editing affordances render only for the workspace owner AND only when the
 *     owner holds the workspace manage capability.
 *   - Mutating endpoints never trust the UI: server actions / route handlers
 *     re-check capabilities against the authenticated membership (and Supabase
 *     RLS provides a second layer).
 *
 * This module is intentionally pure (no server-only imports) so it can be unit
 * tested and safely shared between server pages and client components.
 */

export const FOUNDER_WORKSPACES = {
  technology: {
    key: "technology",
    label: "Technology",
    short: "TECH",
    subtitle: "PRODUCT · ENGINEERING",
    path: "/owners/technology",
    responsibility: "product_technology",
    readCapability: "technology.read",
    manageCapability: "technology.manage",
    decisionDomain: "product_technology",
    featureTarget: "technology",
    focus: "Architecture, product delivery, security and platform reliability.",
  },
  finance: {
    key: "finance",
    label: "Finance",
    short: "FINANCE",
    subtitle: "CASH · CONTROLS · REPORTING",
    path: "/owners/finance",
    responsibility: "finance_governance",
    readCapability: "finance.read",
    manageCapability: "finance.manage",
    decisionDomain: null,
    featureTarget: "finance",
    focus: "Cash position, settlements, pricing controls and reporting.",
  },
  marketing: {
    key: "marketing",
    label: "Marketing",
    short: "GROWTH",
    subtitle: "CAMPAIGNS · SALES · BRAND",
    path: "/owners/marketing",
    responsibility: "business_strategy",
    readCapability: "strategy.read",
    manageCapability: "strategy.manage",
    decisionDomain: "business_strategy",
    featureTarget: "marketing",
    focus: "Positioning, acquisition, campaigns, vendor growth and pipeline.",
  },
} as const satisfies Record<string, WorkspaceDefinition>;

export type WorkspaceKey = keyof typeof FOUNDER_WORKSPACES;
export const WORKSPACE_KEYS = ["technology", "finance", "marketing"] as const satisfies WorkspaceKey[];

type WorkspaceDefinition = {
  key: string;
  label: string;
  short: string;
  subtitle: string;
  path: string;
  responsibility: FounderResponsibility;
  readCapability: FounderCapability;
  manageCapability: FounderCapability;
  decisionDomain: string | null;
  featureTarget: string;
  focus: string;
};

/** Minimal membership shape needed for access decisions. */
export type MembershipLike = {
  responsibilities: string[] | null;
  capabilities: string[] | null;
};

export type WorkspaceAccess = {
  /** Any active founder may open every workspace (read-only preview). */
  canView: boolean;
  /** The authenticated founder owns this workspace domain. */
  isOwner: boolean;
  /** The authenticated founder may edit this workspace (owner + manage capability). */
  canEdit: boolean;
};

export function isWorkspaceOwner(membership: MembershipLike | null | undefined, key: WorkspaceKey): boolean {
  if (!membership) return false;
  return Boolean(membership.responsibilities?.includes(FOUNDER_WORKSPACES[key].responsibility));
}

export function canEditWorkspace(membership: MembershipLike | null | undefined, key: WorkspaceKey): boolean {
  if (!membership) return false;
  const workspace = FOUNDER_WORKSPACES[key];
  return Boolean(
    membership.responsibilities?.includes(workspace.responsibility) &&
      membership.capabilities?.includes(workspace.manageCapability),
  );
}

export function getWorkspaceAccess(membership: MembershipLike | null | undefined, key: WorkspaceKey): WorkspaceAccess {
  const isOwner = isWorkspaceOwner(membership, key);
  return { canView: canViewWorkspace(membership), isOwner, canEdit: canEditWorkspace(membership, key) };
}

/** The workspace(s) a founder owns — used for hub cards and greetings. */
export function getOwnedWorkspaces(membership: MembershipLike | null | undefined): WorkspaceKey[] {
  return WORKSPACE_KEYS.filter((key) => isWorkspaceOwner(membership, key));
}

/** The founder's primary (first owned) workspace, or null for shared-governance-only members. */
export function getPrimaryWorkspace(membership: MembershipLike | null | undefined): WorkspaceKey | null {
  return getOwnedWorkspaces(membership)[0] ?? null;
}

/** Feature-register management is elevated to the Technology owner (technology.manage). */
export function canManageFeatureRequests(membership: MembershipLike | null | undefined): boolean {
  if (!membership) return false;
  return Boolean(membership.capabilities?.includes("technology.manage"));
}

/** Any active founder can view every workspace; this helper documents that intent. */
export function canViewWorkspace(membership: MembershipLike | null | undefined): boolean {
  return Boolean(membership);
}

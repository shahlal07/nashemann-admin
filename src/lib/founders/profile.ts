import { FOUNDER_WORKSPACES, WORKSPACE_KEYS, type WorkspaceKey } from "./workspaces";

/** Accent colour per workspace — matches the founder workspace palette. */
export const WORKSPACE_COLORS: Record<WorkspaceKey, string> = {
  technology: "#8b5cf6",
  finance: "#22d3ee",
  marketing: "#f472b6",
};

/** Long-form domain label shown next to an owner's name. */
export const WORKSPACE_ROLES: Record<WorkspaceKey, string> = {
  technology: "Technology & Product",
  finance: "Finance & Operations",
  marketing: "Marketing & Growth",
};

const SHARED_COLOR = "#34d399";
const SHARED_ROLE = "Shared governance";

export type MembershipSource = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  status: string;
  responsibilities: string[] | null;
  capabilities: string[] | null;
};

/**
 * The founder-facing projection of an `owner_memberships` row.
 * The embedded founder workspace renders exclusively from this shape.
 */
export type FounderProfile = {
  id: string;
  name: string;
  username: string | null;
  initials: string;
  color: string;
  role: string;
  /** The workspace this founder leads, or `null` for shared-governance-only members. */
  workspace: WorkspaceKey | null;
  /** Every workspace this founder owns. */
  workspaces: WorkspaceKey[];
  capabilities: string[];
  canManageFeatureRequests: boolean;
};

export function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function toFounderProfile(membership: MembershipSource | null | undefined): FounderProfile | null {
  if (!membership) return null;

  const responsibilities = membership.responsibilities ?? [];
  const capabilities = membership.capabilities ?? [];
  const workspaces = WORKSPACE_KEYS.filter((key) =>
    responsibilities.includes(FOUNDER_WORKSPACES[key].responsibility),
  );
  const primary = workspaces[0] ?? null;
  const name = membership.display_name?.trim() || membership.username?.trim() || "Founder";

  return {
    id: membership.user_id,
    name,
    username: membership.username,
    initials: initialsFor(name),
    color: primary ? WORKSPACE_COLORS[primary] : SHARED_COLOR,
    role: primary ? WORKSPACE_ROLES[primary] : SHARED_ROLE,
    workspace: primary,
    workspaces,
    capabilities,
    canManageFeatureRequests: capabilities.includes("technology.manage"),
  };
}

/** Display label for a workspace key, e.g. `technology` -> `Technology`. */
export function workspaceLabel(key: WorkspaceKey | null): string {
  return key ? FOUNDER_WORKSPACES[key].label : "All workspaces";
}

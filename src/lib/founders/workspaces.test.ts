import { describe, expect, it } from "vitest";
import {
  FOUNDER_WORKSPACES,
  WORKSPACE_KEYS,
  canEditWorkspace,
  canManageFeatureRequests,
  canViewWorkspace,
  getOwnedWorkspaces,
  getPrimaryWorkspace,
  getWorkspaceAccess,
  isWorkspaceOwner,
  type MembershipLike,
} from "./workspaces";

/**
 * Membership shapes below mirror the live `public.owner_memberships` rows
 * (Supabase project eznxsosvsgkhexbjoolh, inspected 2026-10-19). They are
 * fixtures for authorization-boundary tests — never credentials.
 */
const techOwner: MembershipLike = {
  responsibilities: ["product_technology", "shared_governance"],
  capabilities: [
    "technology.read",
    "technology.manage",
    "governance.read",
    "approvals.read",
    "approvals.request",
    "audit.read",
  ],
};

const financeOwner: MembershipLike = {
  responsibilities: ["finance_governance", "shared_governance"],
  capabilities: [
    "finance.read",
    "governance.read",
    "governance.manage",
    "approvals.read",
    "approvals.request",
    "approvals.review",
    "audit.read",
  ],
};

const marketingOwner: MembershipLike = {
  responsibilities: ["business_strategy", "shared_governance"],
  capabilities: [
    "strategy.read",
    "strategy.manage",
    "governance.read",
    "approvals.read",
    "approvals.request",
    "audit.read",
  ],
};

/** Shared-governance-only member with no domain ownership (edge case). */
const governanceOnly: MembershipLike = {
  responsibilities: ["shared_governance"],
  capabilities: ["governance.read", "approvals.read"],
};

describe("FOUNDER_WORKSPACES definitions", () => {
  it("exactly three workspaces: technology, finance, marketing", () => {
    expect(WORKSPACE_KEYS).toEqual(["technology", "finance", "marketing"]);
    expect(Object.keys(FOUNDER_WORKSPACES).sort()).toEqual(["finance", "marketing", "technology"]);
  });

  it("maps each workspace to the live responsibility/capability model", () => {
    expect(FOUNDER_WORKSPACES.technology.responsibility).toBe("product_technology");
    expect(FOUNDER_WORKSPACES.technology.readCapability).toBe("technology.read");
    expect(FOUNDER_WORKSPACES.technology.manageCapability).toBe("technology.manage");
    expect(FOUNDER_WORKSPACES.technology.decisionDomain).toBe("product_technology");

    expect(FOUNDER_WORKSPACES.finance.responsibility).toBe("finance_governance");
    expect(FOUNDER_WORKSPACES.finance.readCapability).toBe("finance.read");
    expect(FOUNDER_WORKSPACES.finance.manageCapability).toBe("finance.manage");
    expect(FOUNDER_WORKSPACES.finance.decisionDomain).toBeNull();

    expect(FOUNDER_WORKSPACES.marketing.responsibility).toBe("business_strategy");
    expect(FOUNDER_WORKSPACES.marketing.readCapability).toBe("strategy.read");
    expect(FOUNDER_WORKSPACES.marketing.manageCapability).toBe("strategy.manage");
    expect(FOUNDER_WORKSPACES.marketing.decisionDomain).toBe("business_strategy");
  });

  it("routes each workspace under /owners", () => {
    for (const key of WORKSPACE_KEYS) {
      expect(FOUNDER_WORKSPACES[key].path).toBe(`/owners/${key}`);
    }
  });
});

describe("workspace ownership", () => {
  it("assigns each founder exactly their own workspace", () => {
    expect(getOwnedWorkspaces(techOwner)).toEqual(["technology"]);
    expect(getOwnedWorkspaces(financeOwner)).toEqual(["finance"]);
    expect(getOwnedWorkspaces(marketingOwner)).toEqual(["marketing"]);
    expect(getOwnedWorkspaces(governanceOnly)).toEqual([]);
  });

  it("never grants ownership across workspaces", () => {
    expect(isWorkspaceOwner(techOwner, "finance")).toBe(false);
    expect(isWorkspaceOwner(techOwner, "marketing")).toBe(false);
    expect(isWorkspaceOwner(financeOwner, "technology")).toBe(false);
    expect(isWorkspaceOwner(financeOwner, "marketing")).toBe(false);
    expect(isWorkspaceOwner(marketingOwner, "technology")).toBe(false);
    expect(isWorkspaceOwner(marketingOwner, "finance")).toBe(false);
  });

  it("returns null primary workspace for shared-governance-only members", () => {
    expect(getPrimaryWorkspace(governanceOnly)).toBeNull();
    expect(getPrimaryWorkspace(techOwner)).toBe("technology");
  });
});

describe("workspace edit authorization (server-side rule)", () => {
  it("requires BOTH the workspace responsibility and its manage capability", () => {
    // Tech owner: product_technology + technology.manage -> can edit.
    expect(canEditWorkspace(techOwner, "technology")).toBe(true);
    // Cross-workspace edits are denied even for other owners.
    expect(canEditWorkspace(techOwner, "finance")).toBe(false);
    expect(canEditWorkspace(techOwner, "marketing")).toBe(false);

    // Marketing owner: business_strategy + strategy.manage -> can edit.
    expect(canEditWorkspace(marketingOwner, "marketing")).toBe(true);
    expect(canEditWorkspace(marketingOwner, "technology")).toBe(false);
    expect(canEditWorkspace(marketingOwner, "finance")).toBe(false);
  });

  it("denies edit to the finance owner without finance.manage capability", () => {
    // Live data: finance owner holds finance.read but NOT finance.manage.
    expect(canEditWorkspace(financeOwner, "finance")).toBe(false);
    expect(canEditWorkspace(financeOwner, "technology")).toBe(false);
    expect(canEditWorkspace(financeOwner, "marketing")).toBe(false);
  });

  it("denies edit to a member who has the capability but not the responsibility", () => {
    const capabilityOnly: MembershipLike = {
      responsibilities: ["shared_governance"],
      capabilities: ["technology.manage", "strategy.manage", "finance.manage"],
    };
    for (const key of WORKSPACE_KEYS) {
      expect(canEditWorkspace(capabilityOnly, key)).toBe(false);
    }
  });

  it("denies edit to a member who has the responsibility but not the capability", () => {
    const responsibilityOnly: MembershipLike = {
      responsibilities: ["product_technology", "business_strategy", "finance_governance"],
      capabilities: ["technology.read", "strategy.read", "finance.read"],
    };
    for (const key of WORKSPACE_KEYS) {
      expect(canEditWorkspace(responsibilityOnly, key)).toBe(false);
    }
  });
});

describe("read-only preview authorization", () => {
  it("lets any active membership view every workspace (preview)", () => {
    for (const member of [techOwner, financeOwner, marketingOwner, governanceOnly]) {
      for (const key of WORKSPACE_KEYS) {
        expect(canViewWorkspace(member)).toBe(true);
        expect(getWorkspaceAccess(member, key).canView).toBe(true);
      }
    }
  });

  it("reflects isOwner/canEdit accurately in getWorkspaceAccess", () => {
    expect(getWorkspaceAccess(techOwner, "technology")).toEqual({ isOwner: true, canEdit: true, canView: true });
    expect(getWorkspaceAccess(techOwner, "finance")).toEqual({ isOwner: false, canEdit: false, canView: true });
    expect(getWorkspaceAccess(financeOwner, "finance")).toEqual({ isOwner: true, canEdit: false, canView: true });
    expect(getWorkspaceAccess(marketingOwner, "marketing")).toEqual({ isOwner: true, canEdit: true, canView: true });
  });
});

describe("null / malformed membership safety", () => {
  it("treats null membership as no access", () => {
    expect(canViewWorkspace(null)).toBe(false);
    expect(canEditWorkspace(null, "technology")).toBe(false);
    expect(isWorkspaceOwner(null, "technology")).toBe(false);
    expect(canManageFeatureRequests(null)).toBe(false);
    expect(getPrimaryWorkspace(null)).toBeNull();
    expect(getWorkspaceAccess(null, "technology")).toEqual({ isOwner: false, canEdit: false, canView: false });
  });

  it("treats empty/null capability arrays as no access", () => {
    const empty: MembershipLike = { responsibilities: null, capabilities: null };
    for (const key of WORKSPACE_KEYS) {
      expect(canEditWorkspace(empty, key)).toBe(false);
      expect(isWorkspaceOwner(empty, key)).toBe(false);
    }
    expect(canManageFeatureRequests(empty)).toBe(false);
  });
});

describe("feature-register authority (elevated Technology ownership)", () => {
  it("grants feature management only to holders of technology.manage", () => {
    expect(canManageFeatureRequests(techOwner)).toBe(true);
    expect(canManageFeatureRequests(financeOwner)).toBe(false);
    expect(canManageFeatureRequests(marketingOwner)).toBe(false);
    expect(canManageFeatureRequests(governanceOnly)).toBe(false);
  });

  it("is not implied by governance.manage alone", () => {
    const governanceManager: MembershipLike = {
      responsibilities: ["finance_governance", "shared_governance"],
      capabilities: ["governance.manage", "governance.read"],
    };
    expect(canManageFeatureRequests(governanceManager)).toBe(false);
  });
});

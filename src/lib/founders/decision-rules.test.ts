import { describe, expect, it } from "vitest";
import {
  ALLOWED_NEW_DECISION_STATUSES,
  DECISION_DOMAIN_RULES,
  canCreateDecisionInDomain,
  isValidDecisionDomain,
} from "./decision-rules";
import type { MembershipLike } from "./workspaces";

/** Fixtures mirror the live owner_memberships rows (inspected 2026-10-19). */
const techOwner: MembershipLike = {
  responsibilities: ["product_technology", "shared_governance"],
  capabilities: ["technology.read", "technology.manage", "governance.read"],
};

const financeOwner: MembershipLike = {
  responsibilities: ["finance_governance", "shared_governance"],
  capabilities: ["finance.read", "governance.read", "governance.manage", "approvals.review"],
};

const marketingOwner: MembershipLike = {
  responsibilities: ["business_strategy", "shared_governance"],
  capabilities: ["strategy.read", "strategy.manage", "governance.read"],
};

describe("DECISION_DOMAIN_RULES", () => {
  it("covers exactly the two writable decision domains", () => {
    expect(Object.keys(DECISION_DOMAIN_RULES).sort()).toEqual(["business_strategy", "product_technology"]);
    expect(DECISION_DOMAIN_RULES.product_technology).toEqual({
      capability: "technology.manage",
      responsibility: "product_technology",
    });
    expect(DECISION_DOMAIN_RULES.business_strategy).toEqual({
      capability: "strategy.manage",
      responsibility: "business_strategy",
    });
  });

  it("only allows 'proposed' for newly created decisions", () => {
    expect([...ALLOWED_NEW_DECISION_STATUSES]).toEqual(["proposed"]);
  });

  it("validates domains strictly", () => {
    expect(isValidDecisionDomain("product_technology")).toBe(true);
    expect(isValidDecisionDomain("business_strategy")).toBe(true);
    expect(isValidDecisionDomain("finance_governance")).toBe(false);
    expect(isValidDecisionDomain("__proto__")).toBe(false);
    expect(isValidDecisionDomain("")).toBe(false);
  });
});

describe("canCreateDecisionInDomain", () => {
  it("permits the Technology owner only in product_technology", () => {
    expect(canCreateDecisionInDomain(techOwner, "product_technology")).toBe(true);
    expect(canCreateDecisionInDomain(techOwner, "business_strategy")).toBe(false);
  });

  it("permits the Marketing owner only in business_strategy", () => {
    expect(canCreateDecisionInDomain(marketingOwner, "business_strategy")).toBe(true);
    expect(canCreateDecisionInDomain(marketingOwner, "product_technology")).toBe(false);
  });

  it("denies the Finance owner both domains (governance.manage is not domain authority)", () => {
    expect(canCreateDecisionInDomain(financeOwner, "product_technology")).toBe(false);
    expect(canCreateDecisionInDomain(financeOwner, "business_strategy")).toBe(false);
  });

  it("rejects unknown domains, even with full capabilities", () => {
    const admin: MembershipLike = {
      responsibilities: ["shared_governance", "product_technology", "business_strategy"],
      capabilities: ["technology.manage", "strategy.manage", "governance.manage"],
    };
    expect(canCreateDecisionInDomain(admin, "finance_governance")).toBe(false);
    expect(canCreateDecisionInDomain(admin, "unknown_domain")).toBe(false);
    expect(canCreateDecisionInDomain(admin, "")).toBe(false);
  });

  it("denies missing or partial memberships (crafted/anonymous requests)", () => {
    expect(canCreateDecisionInDomain(null, "product_technology")).toBe(false);
    expect(canCreateDecisionInDomain({ responsibilities: null, capabilities: null }, "business_strategy")).toBe(false);
    // Capability but no responsibility -> denied.
    expect(
      canCreateDecisionInDomain(
        { responsibilities: ["shared_governance"], capabilities: ["technology.manage"] },
        "product_technology",
      ),
    ).toBe(false);
    // Responsibility but no capability -> denied.
    expect(
      canCreateDecisionInDomain(
        { responsibilities: ["product_technology"], capabilities: ["technology.read"] },
        "product_technology",
      ),
    ).toBe(false);
  });
});

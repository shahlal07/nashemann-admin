/**
 * Decision-domain authorization rules (pure).
 *
 * Extracted from src/app/api/owners/decisions/route.ts so the exact rules the
 * API enforces can be unit tested, and so workspace pages can reuse them for
 * rendering decisions / forms. The route handler remains the enforcement point:
 * every rule here requires BOTH the domain manage capability AND the domain
 * responsibility on the authenticated membership.
 */

export type DecisionDomainRule = {
  capability: string;
  responsibility: string;
};

export const DECISION_DOMAIN_RULES: Record<string, DecisionDomainRule> = {
  product_technology: {
    capability: "technology.manage",
    responsibility: "product_technology",
  },
  business_strategy: {
    capability: "strategy.manage",
    responsibility: "business_strategy",
  },
};

export const ALLOWED_NEW_DECISION_STATUSES = new Set(["proposed"]);

type DecisionMembershipLike = {
  responsibilities: string[] | null;
  capabilities: string[] | null;
} | null;

export function canCreateDecisionInDomain(membership: DecisionMembershipLike, domain: string): boolean {
  const rule = DECISION_DOMAIN_RULES[domain];
  if (!rule || !membership) return false;
  return Boolean(
    membership.responsibilities?.includes(rule.responsibility) &&
      membership.capabilities?.includes(rule.capability),
  );
}

export function isValidDecisionDomain(domain: string): boolean {
  return Object.prototype.hasOwnProperty.call(DECISION_DOMAIN_RULES, domain);
}

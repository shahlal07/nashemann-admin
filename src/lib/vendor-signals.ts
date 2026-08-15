export type SettlementSignal = {
  month: string;
  status: "pending" | "partially_paid" | "paid" | "waived" | "reversed";
  gross_revenue: number;
  orders_count: number;
  due_date: string | null;
};

export type TenantHealthSignal = {
  total_orders: number;
  failed_orders: number;
  failure_rate: number;
  stock_warnings: number;
  auth_failed_attempts: number;
  last_order_at: string | null;
} | null;

export type HealthComponent = {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  detail: string;
};

export type VendorHealth = {
  score: number | null;
  components: HealthComponent[];
};

export function computeVendorHealth(inputs: {
  settlements: SettlementSignal[];
  avgRating: number | null;
  reviewCount: number;
  tenantHealth: TenantHealthSignal;
}): VendorHealth {
  const { settlements, avgRating, reviewCount, tenantHealth } = inputs;
  const today = new Date().toISOString().slice(0, 10);

  const decidedSettlements = settlements.filter(
    (s) =>
      s.status === "paid" ||
      s.status === "waived" ||
      s.status === "reversed" ||
      ((s.status === "pending" || s.status === "partially_paid") && s.due_date && s.due_date < today)
  );
  const onTimeSettlements = decidedSettlements.filter((s) => s.status === "paid" || s.status === "waived");
  const paymentScore = decidedSettlements.length > 0 ? Math.round((onTimeSettlements.length / decidedSettlements.length) * 100) : null;

  const reviewScore = reviewCount > 0 && avgRating !== null ? Math.round((avgRating / 5) * 100) : null;

  const reliabilityScore = tenantHealth && tenantHealth.total_orders > 0 ? Math.round(Math.max(0, 1 - tenantHealth.failure_rate) * 100) : null;

  const stabilityScore =
    tenantHealth && (tenantHealth.stock_warnings > 0 || tenantHealth.auth_failed_attempts > 0 || tenantHealth.total_orders > 0)
      ? Math.round(Math.max(0, 100 - (tenantHealth.stock_warnings + tenantHealth.auth_failed_attempts) * 4))
      : null;

  const components: HealthComponent[] = [
    {
      key: "payment",
      weight: 0.35,
      label: "Payment timeliness",
      score: paymentScore,
      detail:
        decidedSettlements.length > 0
          ? `${onTimeSettlements.length} of ${decidedSettlements.length} settlements paid/waived on time`
          : "No settlements past due date yet",
    },
    {
      key: "reviews",
      weight: 0.3,
      label: "Customer satisfaction",
      score: reviewScore,
      detail: reviewCount > 0 ? `Average ${avgRating?.toFixed(1)}★ across ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "No reviews yet",
    },
    {
      key: "reliability",
      weight: 0.2,
      label: "Order reliability",
      score: reliabilityScore,
      detail: tenantHealth && tenantHealth.total_orders > 0
        ? `${tenantHealth.failed_orders} failed of ${tenantHealth.total_orders} orders (${Math.round(tenantHealth.failure_rate * 100)}% failure rate)`
        : "No order volume recorded yet",
    },
    {
      key: "stability",
      weight: 0.15,
      label: "Account stability",
      score: stabilityScore,
      detail: tenantHealth
        ? `${tenantHealth.stock_warnings} stock warning${tenantHealth.stock_warnings === 1 ? "" : "s"}, ${tenantHealth.auth_failed_attempts} failed login attempt${tenantHealth.auth_failed_attempts === 1 ? "" : "s"}`
        : "No tenant health data yet",
    },
  ];

  const available = components.filter((c) => c.score !== null);
  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight > 0 ? Math.round(available.reduce((sum, c) => sum + (c.score as number) * c.weight, 0) / totalWeight) : null;

  return { score, components };
}

export type ChurnRisk = { atRisk: boolean; reasons: string[] };

export function computeChurnRisk(inputs: {
  status: string;
  ordersLast30d: number;
  settlements: SettlementSignal[];
  tenantHealth: TenantHealthSignal;
}): ChurnRisk {
  const { status, ordersLast30d, settlements, tenantHealth } = inputs;
  const today = new Date().toISOString().slice(0, 10);
  const reasons: string[] = [];

  const byMonth = [...settlements].sort((a, b) => (a.month < b.month ? -1 : 1));
  if (byMonth.length >= 2) {
    const latest = byMonth[byMonth.length - 1];
    const prior = byMonth[byMonth.length - 2];
    if (prior.gross_revenue > 0 && latest.gross_revenue < prior.gross_revenue * 0.8) {
      const pctDown = Math.round((1 - latest.gross_revenue / prior.gross_revenue) * 100);
      reasons.push(`Settlement revenue down ${pctDown}% month over month`);
    }
  }

  if (status === "active" && ordersLast30d === 0) {
    reasons.push("No orders in the last 30 days");
  }

  const overdue = settlements.filter(
    (s) => (s.status === "pending" || s.status === "partially_paid") && s.due_date && s.due_date < today
  );
  if (overdue.length > 0) {
    reasons.push(`${overdue.length} settlement${overdue.length === 1 ? "" : "s"} overdue`);
  }

  if (tenantHealth && tenantHealth.total_orders >= 5 && tenantHealth.failure_rate > 0.1) {
    reasons.push(`Order failure rate at ${Math.round(tenantHealth.failure_rate * 100)}%`);
  }

  return { atRisk: reasons.length > 0, reasons };
}

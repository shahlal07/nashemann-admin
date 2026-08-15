import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeVendorHealth, computeChurnRisk } from "@/lib/vendor-signals";
import { VendorDetailClient } from "./VendorDetailClient";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select(
      "id, name, subdomain, custom_domain, category, city, status, plan, orders_last_30d, revenue_last_30d, joined_at, theme_accent_from, theme_accent_to, theme_logo_emoji, theme_font"
    )
    .eq("id", id)
    .maybeSingle();

  if (!vendor) notFound();

  const [{ data: admins }, { data: categorySchema }, { data: settlements }, { data: reviews }, { data: tenantHealth }] =
    await Promise.all([
      supabase.from("vendor_admins").select("id, name, email, role, added_at").eq("vendor_id", id).order("added_at", { ascending: true }),
      vendor.category
        ? supabase
            .from("category_product_schemas")
            .select("category, model, fields, variant_example, note")
            .eq("category", vendor.category)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("settlements").select("month, status, gross_revenue, orders_count, due_date").eq("vendor_id", id),
      supabase.from("reviews").select("rating").eq("vendor_id", id),
      supabase
        .from("tenant_health")
        .select("total_orders, failed_orders, failure_rate, stock_warnings, auth_failed_attempts, last_order_at")
        .eq("vendor_id", id)
        .maybeSingle(),
    ]);

  const reviewRows = reviews ?? [];
  const avgRating = reviewRows.length > 0 ? reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length : null;

  const health = computeVendorHealth({
    settlements: settlements ?? [],
    avgRating,
    reviewCount: reviewRows.length,
    tenantHealth: tenantHealth ?? null,
  });

  const churnRisk = computeChurnRisk({
    status: vendor.status,
    ordersLast30d: vendor.orders_last_30d,
    settlements: settlements ?? [],
    tenantHealth: tenantHealth ?? null,
  });

  return (
    <VendorDetailClient
      vendor={vendor}
      initialAdmins={admins ?? []}
      categorySchema={categorySchema}
      health={health}
      churnRisk={churnRisk}
    />
  );
}

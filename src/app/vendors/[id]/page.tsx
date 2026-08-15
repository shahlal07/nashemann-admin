import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: admins } = await supabase
    .from("vendor_admins")
    .select("id, name, email, role, added_at")
    .eq("vendor_id", id)
    .order("added_at", { ascending: true });

  const { data: categorySchema } = vendor.category
    ? await supabase
        .from("category_product_schemas")
        .select("category, model, fields, variant_example, note")
        .eq("category", vendor.category)
        .maybeSingle()
    : { data: null };

  return <VendorDetailClient vendor={vendor} initialAdmins={admins ?? []} categorySchema={categorySchema} />;
}

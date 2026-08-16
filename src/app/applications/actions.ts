"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import { sendApplicationStatusEmail } from "@/lib/email";

export async function decideVendorApplicationAction(input: {
  applicationId: string;
  businessName: string;
  subdomainPreference: string;
  category: string;
  city: string;
  requestedPlan: "per_order" | "monthly";
  ownerName: string;
  ownerEmail: string;
  status: "approved" | "rejected";
}) {
  const { supabase, actor } = await requireMutatingStaff();

  if (input.status === "approved") {
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .insert({
        name: input.businessName,
        subdomain: input.subdomainPreference,
        category: input.category,
        city: input.city,
        plan: input.requestedPlan,
        status: "active",
      })
      .select("id")
      .single();

    if (vendorError || !vendor) {
      throw new Error(
        vendorError?.code === "23505"
          ? `Subdomain "${input.subdomainPreference}" is already taken — resolve the conflict before approving.`
          : `Couldn't create the vendor: ${vendorError?.message ?? "unknown error"}`
      );
    }

    const { error: adminError } = await supabase.from("vendor_admins").insert({
      vendor_id: vendor.id,
      name: input.ownerName,
      email: input.ownerEmail,
      role: "owner",
    });
    if (adminError) throw new Error(`Vendor created, but couldn't add the owner admin: ${adminError.message}`);

    await supabase.from("audit_log").insert({
      action: "vendor_application_approved",
      actor,
      entity: input.businessName,
      detail: `Approved and provisioned as vendor (subdomain: ${input.subdomainPreference}, plan: ${input.requestedPlan})`,
    });
  } else {
    await supabase.from("audit_log").insert({
      action: "vendor_application_rejected",
      actor,
      entity: input.businessName,
      detail: "Rejected from applications queue",
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("vendor_applications")
    .update({ status: input.status, reviewed_at: new Date().toISOString() })
    .eq("id", input.applicationId)
    .select("reference_id")
    .single();
  if (updateError) throw new Error(`Couldn't update the application status: ${updateError.message}`);

  await sendApplicationStatusEmail({
    to: input.ownerEmail,
    ownerName: input.ownerName,
    businessName: input.businessName,
    referenceId: updated?.reference_id ?? input.applicationId,
    status: input.status,
    subdomain: input.status === "approved" ? input.subdomainPreference : undefined,
  });

  revalidatePath("/applications");
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
}

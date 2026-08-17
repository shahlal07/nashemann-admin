"use server";
import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import { provisionVendorStore, syncVendorStatus } from "@/lib/vendor-provisioning";

export async function createVendorStoreAction(input:{businessName:string;subdomain:string;category:string;city:string;plan:"per_order"|"monthly";themeAccentFrom:string;themeAccentTo:string;themeLogoEmoji:string;themeLogoUrl:string|null;ownerName:string;ownerEmail:string;ownerPassword:string}){
 const {supabase,actor}=await requireMutatingStaff(); const {vendorId}=await provisionVendorStore(supabase,input);
 await supabase.from("audit_log").insert({action:"vendor_created",actor,entity:input.businessName,detail:`Store provisioned through shared vendor apps (subdomain: ${input.subdomain}, plan: ${input.plan}, owner: ${input.ownerName})`});
 revalidatePath("/vendors"); revalidatePath("/audit-log"); return vendorId;
}

export async function bulkSetVendorStatusAction(vendorIds:string[],vendorNames:string[],status:"active"|"suspended"){
 const {supabase,actor}=await requireMutatingStaff(); for(const id of vendorIds) await syncVendorStatus(id,status);
 const {error}=await supabase.from("vendors").update({status}).in("id",vendorIds); if(error) throw new Error(error.message);
 await supabase.from("audit_log").insert({action:status==="suspended"?"vendor_suspended":"vendor_reactivated",actor,entity:vendorNames.length<=3?vendorNames.join(", "):`${vendorNames.length} vendors`,detail:`Bulk ${status==="suspended"?"suspend":"reactivate"} (${vendorIds.length} vendors)`});
 revalidatePath("/vendors"); revalidatePath("/audit-log");
}

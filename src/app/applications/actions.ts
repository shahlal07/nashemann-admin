"use server";
import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import { sendApplicationStatusEmail, sendVendorAdminCredentialsChangedEmail } from "@/lib/email";
import { provisionVendorStore, temporaryVendorPassword } from "@/lib/vendor-provisioning";
const DEFAULT_THEME={themeAccentFrom:"#6d5dfc",themeAccentTo:"#9b8cff",themeLogoEmoji:"◈",themeLogoUrl:null};
export async function decideVendorApplicationAction(input:{applicationId:string;businessName:string;subdomainPreference:string;category:string;city:string;requestedPlan:"per_order"|"monthly";ownerName:string;ownerEmail:string;status:"approved"|"rejected"}){
 const {supabase,actor}=await requireMutatingStaff();
 if(input.status==="approved"){
  const ownerPassword=temporaryVendorPassword();
  const {vendorId}=await provisionVendorStore(supabase,{businessName:input.businessName,subdomain:input.subdomainPreference,category:input.category,city:input.city,plan:input.requestedPlan,...DEFAULT_THEME,ownerName:input.ownerName,ownerEmail:input.ownerEmail,ownerPassword});
  await supabase.from("audit_log").insert({action:"vendor_application_approved",actor,entity:input.businessName,detail:`Approved and provisioned as LIVE vendor (vendor: ${vendorId}, subdomain: ${input.subdomainPreference})`});
  await sendVendorAdminCredentialsChangedEmail({to:input.ownerEmail,name:input.ownerName,storeName:input.businessName,storeUrl:`https://${input.subdomainPreference}.nashemann.store`,adminUrl:`https://admin.${input.subdomainPreference}.nashemann.store`,passwordChanged:true,temporaryPassword:ownerPassword});
 } else await supabase.from("audit_log").insert({action:"vendor_application_rejected",actor,entity:input.businessName,detail:"Rejected from applications queue"});
 const {data:updated,error:updateError}=await supabase.from("vendor_applications").update({status:input.status,reviewed_at:new Date().toISOString()}).eq("id",input.applicationId).select("reference_id").single();
 if(updateError) throw new Error(`Couldn't update the application status: ${updateError.message}`);
 await sendApplicationStatusEmail({to:input.ownerEmail,ownerName:input.ownerName,businessName:input.businessName,referenceId:updated?.reference_id??input.applicationId,status:input.status,subdomain:input.status==="approved"?input.subdomainPreference:undefined});
 revalidatePath("/applications"); revalidatePath("/vendors"); revalidatePath("/audit-log");
}

"use server";
import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import { sendApplicationStatusEmail, sendVendorAdminCredentialsChangedEmail } from "@/lib/email";
import { provisionVendorStore, temporaryVendorPassword } from "@/lib/vendor-provisioning";
const DEFAULT_THEME={themeAccentFrom:"#6d5dfc",themeAccentTo:"#9b8cff",themeLogoEmoji:"◈",themeLogoUrl:null};
export type DecideApplicationResult = { success: true } | { error: string };
export async function decideVendorApplicationAction(input:{applicationId:string;businessName:string;subdomainPreference:string;category:string;city:string;requestedPlan:"per_order"|"monthly";ownerName:string;ownerEmail:string;status:"approved"|"rejected"}):Promise<DecideApplicationResult>{
 const {supabase,actor}=await requireMutatingStaff();
 let ownerPassword: string | undefined;
 if(input.status==="approved"){
  ownerPassword=temporaryVendorPassword();
  const result=await provisionVendorStore(supabase,{businessName:input.businessName,subdomain:input.subdomainPreference,category:input.category,city:input.city,plan:input.requestedPlan,...DEFAULT_THEME,ownerName:input.ownerName,ownerEmail:input.ownerEmail,ownerPassword});
  if("error" in result) return {error:result.error};
  await supabase.from("audit_log").insert({action:"vendor_application_approved",actor,entity:input.businessName,detail:`Approved and provisioned as LIVE vendor (vendor: ${result.vendorId}, subdomain: ${input.subdomainPreference})`});
 } else await supabase.from("audit_log").insert({action:"vendor_application_rejected",actor,entity:input.businessName,detail:"Rejected from applications queue"});

 // Status flips to approved/rejected right after the vendor is actually
 // provisioned (or rejection is logged) -- previously this ran AFTER the
 // credentials email too, so an email-send failure left a fully-provisioned
 // vendor whose application still showed "pending," and re-approving it
 // then failed on the subdomain-conflict check with no way to fix it from
 // this screen.
 const {data:updated,error:updateError}=await supabase.from("vendor_applications").update({status:input.status,reviewed_at:new Date().toISOString()}).eq("id",input.applicationId).select("reference_id").single();
 if(updateError) return {error:`Vendor was provisioned but the application status couldn't be updated: ${updateError.message}`};

 // Emails are best-effort from here on -- provisioning and the status flip
 // already succeeded, so a transactional-email hiccup shouldn't surface as
 // a failure to the operator or leave them unsure whether approval worked.
 if(input.status==="approved" && ownerPassword){
  await sendVendorAdminCredentialsChangedEmail({to:input.ownerEmail,name:input.ownerName,storeName:input.businessName,storeUrl:`https://${input.subdomainPreference}.nashemann.store`,adminUrl:`https://admin.${input.subdomainPreference}.nashemann.store`,passwordChanged:true,temporaryPassword:ownerPassword}).catch(()=>undefined);
 }
 await sendApplicationStatusEmail({to:input.ownerEmail,ownerName:input.ownerName,businessName:input.businessName,referenceId:updated?.reference_id??input.applicationId,status:input.status,subdomain:input.status==="approved"?input.subdomainPreference:undefined}).catch(()=>undefined);

 revalidatePath("/applications"); revalidatePath("/vendors"); revalidatePath("/audit-log");
 return {success:true};
}

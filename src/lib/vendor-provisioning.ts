import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProvisionInput = { businessName:string; subdomain:string; category:string; city:string; plan:"per_order"|"monthly"; themeAccentFrom:string; themeAccentTo:string; themeLogoEmoji:string; themeLogoUrl:string|null; ownerName:string; ownerEmail:string; ownerPassword:string };
function url(path:string){ const base=process.env.VENDOR_PROVISION_URL; if(!base) throw new Error("Vendor provisioning is not configured. Set VENDOR_PROVISION_URL."); const u=new URL(base); u.pathname=path; u.search=""; return u.toString(); }
function secret(){ const s=process.env.VENDOR_PROVISION_SECRET; if(!s) throw new Error("Vendor provisioning is not configured. Set VENDOR_PROVISION_SECRET."); return s; }
export function temporaryVendorPassword(){ return `Ns-${crypto.randomUUID()}-Aa1!`; }
export async function provisionVendorStore(supabase:SupabaseClient,input:ProvisionInput){
 const {data:vendor,error}=await supabase.from("vendors").insert({name:input.businessName,subdomain:input.subdomain,category:input.category,city:input.city,plan:input.plan,status:"provisioning",theme_accent_from:input.themeAccentFrom,theme_accent_to:input.themeAccentTo,theme_logo_emoji:input.themeLogoEmoji,theme_logo_url:input.themeLogoUrl}).select("id").single();
 if(error||!vendor) throw new Error(error?.code==="23505"?`Subdomain "${input.subdomain}" is already taken — pick another one.`:`Couldn't create the store: ${error?.message??"unknown error"}`);
 try {
  const response=await fetch(url("/api/platform/provision"),{method:"POST",headers:{"content-type":"application/json","x-nashemann-provisioning-secret":secret()},body:JSON.stringify({platformVendorId:vendor.id,...input}),cache:"no-store"});
  if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`Vendor provisioning failed (${response.status}). ${detail.slice(0,300)}`.trim());}
  await supabase.from("vendor_admins").upsert({vendor_id:vendor.id,name:input.ownerName,email:input.ownerEmail,role:"owner"},{onConflict:"vendor_id,email"});
  const {error:activateError}=await supabase.from("vendors").update({status:"active"}).eq("id",vendor.id);
  if(activateError) throw new Error(`Store was provisioned, but Nashemann couldn't mark it live: ${activateError.message}`);
  return {vendorId:vendor.id as string};
 } catch(e){ await syncVendorStatus(vendor.id,"suspended").catch(()=>{}); await supabase.from("vendors").update({status:"failed"}).eq("id",vendor.id); throw e instanceof Error?e:new Error("Vendor provisioning failed."); }
}
export async function syncVendorStatus(vendorId:string,status:"active"|"suspended"){
 const response=await fetch(url("/api/platform/status"),{method:"POST",headers:{"content-type":"application/json","x-nashemann-provisioning-secret":secret()},body:JSON.stringify({vendorId,status}),cache:"no-store"});
 const payload=await response.json().catch(()=>({})) as {error?:string}; if(!response.ok) throw new Error(payload.error??`Couldn't sync vendor status (${response.status}).`);
}

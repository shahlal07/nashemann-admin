import { NextResponse } from "next/server";
import { assertPlatformInternalRequest, getPlatformAdminClient } from "@/lib/platform-internal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertPlatformInternalRequest(request);
    const body = await request.json().catch(() => ({}));
    const vendorId = String(body.vendorId ?? "").trim();
    const subdomain = String(body.subdomain ?? "").trim().toLowerCase();
    const customDomain = body.customDomain ? String(body.customDomain).trim().toLowerCase() : null;
    if (!vendorId || !subdomain) return NextResponse.json({ error: "vendorId and subdomain are required." }, { status: 400 });

    const admin = getPlatformAdminClient();
    const { data: vendor, error: vendorError } = await admin.from("vendors").select("id").eq("id", vendorId).maybeSingle();
    if (vendorError) throw new Error(vendorError.message);
    if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });

    return NextResponse.json({ customDomain: customDomain ?? `${subdomain}.nashemann.store` });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't sync vendor domain." }, { status: 500 });
  }
}

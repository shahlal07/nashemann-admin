import { NextResponse } from "next/server";
import { assertPlatformInternalRequest, getPlatformAdminClient } from "@/lib/platform-internal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertPlatformInternalRequest(request);
    const body = await request.json().catch(() => ({}));
    const vendorId = String(body.vendorId ?? "").trim();
    const status = body.status === "suspended" ? "suspended" : "active";
    if (!vendorId) return NextResponse.json({ error: "vendorId is required." }, { status: 400 });

    const admin = getPlatformAdminClient();
    const { error } = await admin.from("vendors").update({ status }).eq("id", vendorId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't sync vendor status." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { assertPlatformInternalRequest, getPlatformAdminClient } from "@/lib/platform-internal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertPlatformInternalRequest(request);
    const body = await request.json().catch(() => ({}));
    const vendorId = String(body.vendorId ?? "").trim();
    const feeType = body.feeType === "fixed" ? "fixed" : "percent";
    if (!vendorId) return NextResponse.json({ error: "vendorId is required." }, { status: 400 });

    const admin = getPlatformAdminClient();
    const values = feeType === "percent"
      ? { fee_type: "percent", fee_override_percent: Number(body.feePercent ?? 0), fee_override_fixed_amount: null }
      : { fee_type: "fixed", fee_override_percent: null, fee_override_fixed_amount: Number(body.feeFixedAmount ?? 0) };
    if (Object.values(values).some((value) => typeof value === "number" && !Number.isFinite(value))) {
      return NextResponse.json({ error: "Invalid fee value." }, { status: 400 });
    }

    const { error } = await admin.from("vendors").update(values).eq("id", vendorId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't sync vendor fee." }, { status: 500 });
  }
}

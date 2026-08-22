import { NextResponse } from "next/server";
import { diagnosePlatformEnv } from "@/lib/platform-internal";

export const dynamic = "force-dynamic";

export async function GET() {
  const diag = diagnosePlatformEnv();

  return NextResponse.json({
    status: diag.ok ? "healthy" : "misconfigured",
    timestamp: new Date().toISOString(),
    diagnostics: diag,
    message: diag.ok
      ? "All platform environment variables are configured."
      : `Missing environment variables: ${diag.missing.join(", ")}`,
  }, { status: diag.ok ? 200 : 503 });
}

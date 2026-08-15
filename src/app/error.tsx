"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Route-segment error boundary. Catches any render/data-fetch throw below
 * the root layout (so the sidebar/topbar chrome still renders around this)
 * and gives staff a real recovery action instead of a blank crash screen.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-5 py-16 text-center">
      <AlertTriangle size={26} className="text-[var(--danger)]" />
      <h1 className="font-display mt-4 text-lg font-semibold text-[var(--text)]">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
        This page hit an unexpected error loading its data. You can retry, and if it keeps happening, check the audit
        log or Supabase status.
      </p>
      <Button variant="primary" size="sm" className="mt-5" onClick={() => reset()}>
        <RotateCw size={13} /> Try again
      </Button>
    </div>
  );
}

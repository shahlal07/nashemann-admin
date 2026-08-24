"use client";

import { useEffect } from "react";

// A stale JS chunk reference (page open across a deploy that replaced the
// build, or a flaky connection) fails with one of these -- reset() can't
// fix it since the chunk URL itself is gone, only a real reload re-fetches
// the current build.
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      error.message
    )
  );
}

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Super Admin Error Boundary]", error);
    if (isChunkLoadError(error)) {
      const key = "nashemann_admin_chunk_reload_attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  const isAuthError = error.message?.toLowerCase().includes("unauthorized") ||
    error.message?.toLowerCase().includes("platform request");
  const isSupabaseError = error.message?.toLowerCase().includes("supabase") ||
    error.message?.toLowerCase().includes("service-role");

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-lg">⚠</div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
        </div>
        <p className="text-neutral-400 mb-4">An error occurred while rendering this page. This usually means a server-side request failed.</p>
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 mb-6 font-mono text-sm overflow-auto">
          <p className="text-red-400 mb-2">Error: {error.message || "Unknown error"}</p>
          {error.digest && <p className="text-neutral-500">Digest: {error.digest}</p>}
        </div>
        {isAuthError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
            <p className="text-amber-400 font-medium mb-1">Authentication Issue Detected</p>
            <p className="text-neutral-400 text-sm">The platform internal secret may be missing or mismatched. Check <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">VENDOR_PROVISION_SECRET</code> in Vercel.</p>
          </div>
        )}
        {isSupabaseError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
            <p className="text-amber-400 font-medium mb-1">Supabase Configuration Issue</p>
            <p className="text-neutral-400 text-sm">The service role key may be missing. Check <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => (isChunkLoadError(error) ? window.location.reload() : reset())} className="px-4 py-2 bg-neutral-100 text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors">Try Again</button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-neutral-800 text-neutral-100 rounded-lg font-medium hover:bg-neutral-700 transition-colors">Reload Page</button>
        </div>
      </div>
    </div>
  );
}

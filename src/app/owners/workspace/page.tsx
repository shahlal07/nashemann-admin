import { ArrowLeft } from "lucide-react";
import { requireOwner } from "@/lib/owner-authz";

export const dynamic = "force-dynamic";

/**
 * Nashemann Founder Workspace.
 *
 * `public/founder-workspace.html` holds the live owner panel: 21 views over a
 * shared Supabase-backed store, embedded in an iframe so it keeps its own
 * document scope (CSS variables, `data-theme`, fonts, layout) without any of it
 * leaking into — or being overridden by — the admin app shell.
 *
 * It is not a demo. The panel hydrates from `GET /api/owner/workspace` (records,
 * session and metrics, all derived from the database), writes every change back
 * through `POST /api/owner/workspace`, and shows an empty state until real
 * records exist. All 21 views ship in one document and route client-side
 * (Technology / Finance / Marketing workspaces, Overview, Pipeline, Tasks,
 * Calendar, Risks, Tech, Marketing, Sales, Vendors, Customers, Finance, Profit,
 * Founders, Decisions, Team, Owner Chat, Reports, Documents, Notifications,
 * Settings, Feature Requests), so no additional routes are needed.
 *
 * Access is gated by the real owner membership: `requireOwner()` resolves the
 * authenticated Supabase user and the `owner_memberships` row server-side
 * before the frame is rendered. Unauthenticated visitors are redirected to
 * `/owner-login`; inactive or missing memberships to `/owner-login?error=not-authorized`.
 */
export default async function FounderWorkspacePage() {
  await requireOwner();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#06060b]">
      <iframe
        src="/founder-workspace.html"
        title="Nashemann Founder Workspace"
        className="h-full w-full border-0"
      />
      <a
        href="/owners"
        className="accent-ring fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/65 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-md transition hover:border-white/30 hover:text-white"
      >
        <ArrowLeft size={14} />
        Owner hub
      </a>
    </div>
  );
}

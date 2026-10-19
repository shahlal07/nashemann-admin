import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Eye,
  LayoutDashboard,
  Lock,
  PencilLine,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  FOUNDER_WORKSPACES,
  WORKSPACE_KEYS,
  type WorkspaceAccess,
  type WorkspaceKey,
} from "@/lib/founders/workspaces";

/**
 * Presentational building blocks for the founder workspace experience,
 * rebuilt from the V5 design reference (nashemann-founder-workspaces-v5).
 *
 * These are server components with no data access of their own — pages pass
 * real, capability-filtered data. Styling follows the app's existing system:
 * Tailwind v4 arbitrary values over CSS custom properties.
 */

const WORKSPACE_ACCENT_BAR: Record<WorkspaceKey, string> = {
  technology: "linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))",
  finance: "linear-gradient(90deg, var(--accent-cyan), var(--success))",
  marketing: "linear-gradient(90deg, var(--accent-pink), var(--accent-violet))",
};

const WORKSPACE_MARK_BG: Record<WorkspaceKey, string> = {
  technology: "linear-gradient(135deg, var(--accent-violet), #6d28d9)",
  finance: "linear-gradient(135deg, var(--accent-cyan), #0e7490)",
  marketing: "linear-gradient(135deg, var(--accent-pink), var(--accent-violet))",
};

const WORKSPACE_ICON = {
  technology: Cpu,
  finance: Wallet,
  marketing: TrendingUp,
} as const;

export function LiveCrumb({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)] shadow-[0_0_10px_var(--success)]" />
      {children}
    </p>
  );
}

export function WorkspaceHero({
  crumb,
  title,
  accentTitle,
  description,
}: {
  crumb: string;
  title: string;
  accentTitle?: string;
  description: string;
}) {
  return (
    <section className="max-w-3xl">
      <LiveCrumb>{crumb}</LiveCrumb>
      <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.06] tracking-[-0.04em] text-[var(--text)] sm:text-4xl">
        {title}
        {accentTitle ? (
          <>
            {" "}
            <span className="accent-text">{accentTitle}</span>
          </>
        ) : null}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>
    </section>
  );
}

export function WorkspaceSwitcher({ active }: { active: WorkspaceKey }) {
  return (
    <nav
      aria-label="Switch founder workspace"
      className="grid max-w-xl grid-cols-3 gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5"
    >
      {WORKSPACE_KEYS.map((key) => {
        const workspace = FOUNDER_WORKSPACES[key];
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={workspace.path}
            aria-current={isActive ? "page" : undefined}
            className={
              "accent-ring flex min-w-0 flex-col justify-center gap-1 rounded-xl border px-3 py-2.5 text-left transition " +
              (isActive
                ? "border-[rgba(139,107,255,.42)] bg-[var(--accent-gradient-soft)] text-[var(--text)] shadow-[inset_0_1px_rgba(255,255,255,.06)]"
                : "border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]")
            }
          >
            <span
              aria-hidden="true"
              className="h-[3px] w-6 rounded-full"
              style={{ background: WORKSPACE_ACCENT_BAR[key] }}
            />
            <span className="truncate text-xs font-semibold sm:text-sm">{workspace.label}</span>
            <span className="hidden truncate font-mono text-[8px] uppercase tracking-[0.08em] opacity-80 sm:block">
              {workspace.subtitle}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Amber permission banner shown when a founder previews a workspace they do not own. */
export function PreviewBanner({ workspaceLabel, viewerLabel }: { workspaceLabel: string; viewerLabel: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-[rgba(251,191,36,.28)] bg-[var(--warning-bg)] px-4 py-3.5 text-xs leading-5 text-[var(--text-muted)]"
    >
      <Eye size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" />
      <p>
        <strong className="font-semibold text-[var(--text)]">Read-only preview — {workspaceLabel}.</strong>{" "}
        You are signed in as {viewerLabel}. You can review this content, but your account has no edit permission for
        it — every write is validated against your membership server-side and rejected there, regardless of what the
        interface shows.
      </p>
    </div>
  );
}

/**
 * Page shell for a founder workspace: switcher + optional preview banner +
 * read-only visual dimming for previewers. Edit controls are simply not
 * rendered in preview mode; server actions and RLS remain the enforcement layer.
 */
export function WorkspacePage({
  workspaceKey,
  access,
  viewerLabel,
  children,
}: {
  workspaceKey: WorkspaceKey;
  access: WorkspaceAccess;
  viewerLabel: string;
  children: ReactNode;
}) {
  const workspace = FOUNDER_WORKSPACES[workspaceKey];
  return (
    <div className="space-y-6 pb-8">
      <WorkspaceSwitcher active={workspaceKey} />
      {!access.canEdit && <PreviewBanner workspaceLabel={`${workspace.label} workspace`} viewerLabel={viewerLabel} />}
      <div className={access.canEdit ? "space-y-6" : "workspace-preview space-y-6"}>{children}</div>
    </div>
  );
}

/** V5 panel card with the top gradient hairline. */
export function PanelCard({
  title,
  badge,
  description,
  children,
  className = "",
}: {
  title?: string;
  badge?: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel-hairline rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 " + className}>
      {(title || badge) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-display text-base font-semibold tracking-[-0.02em] text-[var(--text)]">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p>}
          </div>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageStat({ label, value, foot }: { label: string; value: ReactNode; foot?: string }) {
  return (
    <div className="panel-hairline min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2.5 font-display text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[var(--text)]">
        {value}
      </p>
      {foot && <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--text-faint)]">{foot}</p>}
    </div>
  );
}

const STATUS_PILL_TONES: Record<string, string> = {
  neutral: "border-[var(--border)] text-[var(--text-muted)]",
  violet: "border-[rgba(139,107,255,.35)] text-[var(--accent-violet-deep)]",
  cyan: "border-[rgba(34,211,238,.35)] text-[var(--accent-cyan)]",
  pink: "border-[rgba(244,114,182,.35)] text-[var(--accent-pink)]",
  good: "border-[rgba(52,211,153,.35)] text-[var(--success)]",
  warn: "border-[rgba(251,191,36,.4)] text-[var(--warning)]",
  danger: "border-[rgba(251,113,133,.4)] text-[var(--danger)]",
};

const STATUS_PILL_DOTS: Record<string, string> = {
  neutral: "bg-[var(--text-faint)]",
  violet: "bg-[var(--accent-violet)]",
  cyan: "bg-[var(--accent-cyan)]",
  pink: "bg-[var(--accent-pink)]",
  good: "bg-[var(--success)]",
  warn: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
};

export function StatusPill({ tone = "neutral", children }: { tone?: keyof typeof STATUS_PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] " +
        (STATUS_PILL_TONES[tone] ?? STATUS_PILL_TONES.neutral)
      }
    >
      <span className={"h-1.5 w-1.5 rounded-full " + (STATUS_PILL_DOTS[tone] ?? STATUS_PILL_DOTS.neutral)} />
      {children}
    </span>
  );
}

export function SoftNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-[rgba(139,107,255,.25)] bg-[rgba(139,107,255,.07)] px-4 py-3 text-[11px] leading-5 text-[var(--text-muted)]">
      {children}
    </p>
  );
}

export function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--text-faint)]">
        <CheckCircle2 size={19} />
      </div>
      <p className="mt-3 text-sm font-medium text-[var(--text)]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

export function RestrictedPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
      <Lock size={19} className="mx-auto text-[var(--text-faint)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text)]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

export function WarningPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[rgba(251,191,36,.3)] bg-[var(--warning-bg)] p-5">
      <AlertTriangle size={19} className="mt-0.5 shrink-0 text-[var(--warning)]" />
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{message}</p>
      </div>
    </div>
  );
}

/** Hub card for one workspace: owner identity + viewer access + link. */
export function WorkspaceCard({
  workspaceKey,
  ownerName,
  access,
}: {
  workspaceKey: WorkspaceKey;
  ownerName: string | null;
  access: WorkspaceAccess;
}) {
  const workspace = FOUNDER_WORKSPACES[workspaceKey];
  const Icon = WORKSPACE_ICON[workspaceKey];
  return (
    <Link
      href={workspace.path}
      className="panel-hairline group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-2xl font-display text-sm font-bold text-white shadow-[0_7px_22px_rgba(0,0,0,.25)]"
        style={{ background: WORKSPACE_MARK_BG[workspaceKey] }}
      >
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold text-[var(--text)]">{workspace.label}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent-cyan)]">
        {workspace.subtitle}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{workspace.focus}</p>
      <p className="mt-3 text-[11px] text-[var(--text-faint)]">
        {ownerName ? `Workspace owner: ${ownerName}` : "No active owner assigned"}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        {access.canEdit ? (
          <StatusPill tone="violet">
            <PencilLine size={11} /> Edit
          </StatusPill>
        ) : access.isOwner ? (
          <StatusPill tone="cyan">Your workspace</StatusPill>
        ) : (
          <StatusPill tone="neutral">
            <Eye size={11} /> Preview
          </StatusPill>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-violet-deep)]">
          Open <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Small link used in headers pointing back to the shared governance register. */
export function RegisterLink({ href = "/owners/features" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="accent-ring inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-violet-deep)] transition hover:opacity-85"
    >
      <Sparkles size={15} /> Shared feature register
    </Link>
  );
}

export { LayoutDashboard as OverviewIcon };

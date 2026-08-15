import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "violet";

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  info: "bg-[var(--info-bg)] text-[var(--info)]",
  neutral: "bg-white/[0.06] text-[var(--text-muted)]",
  violet: "bg-[rgba(139,107,255,0.14)] text-[var(--accent-violet-deep)]",
};

export function Badge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold",
        TONE_STYLES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const VENDOR_STATUS_TONE: Record<string, Tone> = {
  active: "success",
  provisioning: "warning",
  suspended: "neutral",
  failed: "danger",
};

export function VendorStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={VENDOR_STATUS_TONE[status] ?? "neutral"} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

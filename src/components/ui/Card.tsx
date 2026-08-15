import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("glass-panel rounded-[var(--radius-lg)] p-5", className)} style={{ boxShadow: "var(--shadow-soft)" }}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display text-base font-semibold text-[var(--text)]">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

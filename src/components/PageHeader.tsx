import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

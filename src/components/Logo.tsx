export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black"
        style={{ background: "var(--accent-gradient)" }}
      >
        N
      </div>
      {!compact && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-[var(--text)]">
          Nashemann
        </span>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_STYLES: Record<Variant, string> = {
  primary: "text-black shadow-[var(--shadow-glow-violet)] hover:brightness-110",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
  ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  danger: "border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[rgba(251,113,133,0.18)]",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "accent-ring inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      style={variant === "primary" ? { background: "var(--accent-gradient)", ...style } : style}
      {...props}
    />
  );
}

"use client";

import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

type Shape = "circle" | "square";

export function ImageUploadField({
  value,
  onFileSelected,
  label,
  loading = false,
  onRemove,
  shape = "square",
  className,
}: {
  value: string | null;
  onFileSelected: (file: File) => void;
  label: string;
  loading?: boolean;
  onRemove?: () => void;
  shape?: Shape;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Please choose a PNG, JPG, or WEBP.");
      return;
    }
    setError(null);
    onFileSelected(file);
  }

  function openPicker() {
    if (loading) return;
    inputRef.current?.click();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--text)]">
        {label}
      </label>

      <div className="flex items-start gap-4">
        <div
          role="button"
          tabIndex={loading ? -1 : 0}
          aria-disabled={loading}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!loading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "accent-ring group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-dashed border-[var(--border-strong)] bg-[var(--surface)] transition-colors",
            shape === "circle" ? "rounded-full" : "rounded-[var(--radius-md)]",
            isDragging && "border-[var(--accent-violet)] bg-[var(--surface-hover)]",
            loading && "cursor-not-allowed opacity-70"
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 px-2 text-center">
              <ImagePlus size={20} className="text-[var(--text-faint)]" />
              <span className="text-[0.65rem] leading-tight text-[var(--text-faint)]">Click or drop</span>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          )}

          {!loading && value && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="accent-ring absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1 pt-1">
          <p className="text-xs text-[var(--text-muted)]">Drag and drop an image, or click to browse.</p>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={loading}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

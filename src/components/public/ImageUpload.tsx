"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload, X, ImageIcon } from "lucide-react";

export function ImageUpload({
  label,
  hint,
  onFileSelected,
  aspect = "square",
}: {
  label: string;
  hint?: string;
  onFileSelected?: (file: File | null, previewUrl: string | null) => void;
  aspect?: "square" | "wide";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  function handleFile(file: File | null) {
    if (!file) {
      setPreview(null);
      onFileSelected?.(null, null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelected?.(file, url);
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={label}
        className={`accent-ring relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed p-5 text-center transition-colors ${
          dragging ? "border-[var(--accent-violet)] bg-[var(--accent-gradient-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
        } ${aspect === "wide" ? "aspect-[16/9]" : "aspect-square max-w-[10rem]"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a static asset next/image can optimize */}
            <img src={preview} alt="" className="absolute inset-0 h-full w-full rounded-[calc(var(--radius-md)-2px)] object-cover" />
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                handleFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="accent-ring absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:opacity-100"
              style={{ opacity: 1 }}
              aria-label="Remove image"
            >
              <X size={13} />
            </motion.button>
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--text-faint)]">
              <Upload size={15} />
            </div>
            <p className="text-xs text-[var(--text-faint)]">Click or drag to upload</p>
          </>
        )}
      </div>
      {hint && <p className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-[var(--text-faint)]"><ImageIcon size={11} /> {hint}</p>}
    </div>
  );
}

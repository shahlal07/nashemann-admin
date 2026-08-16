"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, Reorder, useReducedMotion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";

type GalleryImage = { id: string; url: string };

export function ImageGalleryPicker({
  images,
  onFilesSelected,
  onRemove,
  onReorder,
  loading = false,
  maxImages = 6,
  label,
  className,
}: {
  images: GalleryImage[];
  onFilesSelected: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  loading?: boolean;
  maxImages?: number;
  label?: string;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const idsKey = images.map((img) => img.id).join(",");
  const [prevIdsKey, setPrevIdsKey] = useState(idsKey);
  const [order, setOrder] = useState<string[]>(() => images.map((img) => img.id));
  const [error, setError] = useState<string | null>(null);

  if (prevIdsKey !== idsKey) {
    setPrevIdsKey(idsKey);
    setOrder(images.map((img) => img.id));
  }

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = order.map((id) => byId.get(id)).filter((img): img is GalleryImage => Boolean(img));

  const remainingSlots = Math.max(0, maxImages - images.length);
  const atLimit = remainingSlots === 0;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const imagesOnly = files.filter((f) => f.type.startsWith("image/"));
    const accepted = imagesOnly.slice(0, remainingSlots);

    if (imagesOnly.length < files.length) {
      setError("Some files were skipped — only image files are allowed.");
    } else if (accepted.length < imagesOnly.length) {
      setError(`Only added ${accepted.length} — you can have up to ${maxImages} images.`);
    } else {
      setError(null);
    }

    if (accepted.length > 0) onFilesSelected(accepted);
  }

  function openPicker() {
    if (loading || atLimit) return;
    inputRef.current?.click();
  }

  function handleReorder(newOrder: string[]) {
    setOrder(newOrder);
    onReorder?.(newOrder);
  }

  const thumbnails = ordered.map((img) => (
    <ThumbnailWrapper key={img.id} draggable={Boolean(onReorder)} id={img.id} reducedMotion={prefersReducedMotion}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt="" className="h-full w-full object-cover" />
      {!loading && (
        <button
          type="button"
          onClick={() => onRemove(img.id)}
          className="accent-ring absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          aria-label="Remove image"
        >
          <X size={12} />
        </button>
      )}
    </ThumbnailWrapper>
  ));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <p className="text-sm font-medium text-[var(--text)]">{label}</p>}

      {onReorder ? (
        <Reorder.Group
          as="div"
          axis="xy"
          values={order}
          onReorder={handleReorder}
          className="grid grid-cols-3 gap-3 sm:grid-cols-4"
        >
          <AnimatePresence initial={false}>{thumbnails}</AnimatePresence>
          <AddTile onClick={openPicker} disabled={loading || atLimit} loading={loading} />
        </Reorder.Group>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {thumbnails}
          <AddTile onClick={openPicker} disabled={loading || atLimit} loading={loading} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-[var(--text-muted)]">
          {atLimit
            ? `Maximum of ${maxImages} images reached.`
            : `${images.length}/${maxImages} images${onReorder ? " — drag to reorder." : "."}`}
        </p>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={loading || atLimit}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ThumbnailWrapper({
  id,
  draggable,
  reducedMotion,
  children,
}: {
  id: string;
  draggable: boolean;
  reducedMotion: boolean | null;
  children: React.ReactNode;
}) {
  const className = cn(
    "relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)]",
    draggable && "cursor-grab active:cursor-grabbing"
  );

  if (!draggable) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Reorder.Item
      as="div"
      value={id}
      className={className}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
    >
      {children}
    </Reorder.Item>
  );
}

function AddTile({ onClick, disabled, loading }: { onClick: () => void; disabled: boolean; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="accent-ring flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      <span className="text-[0.65rem]">Add</span>
    </button>
  );
}

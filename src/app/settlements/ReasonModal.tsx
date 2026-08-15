"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] accent-ring";

export function ReasonModal({
  open,
  onClose,
  title,
  actionLabel,
  successMessage,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  actionLabel: string;
  successMessage: string;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClose() {
    if (pending) return;
    setReason("");
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(reason);
        showToast(successMessage, "success");
        setReason("");
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        setError(message);
        showToast(message, "error");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <textarea
          className={inputClass}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason…"
          autoFocus
        />
        {error && <p className="text-xs font-medium text-[var(--danger)]">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" disabled={pending}>
            {pending ? "Saving…" : actionLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

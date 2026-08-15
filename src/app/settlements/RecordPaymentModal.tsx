"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { recordPaymentAction } from "./actions";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

export function RecordPaymentModal({
  open,
  onClose,
  settlementId,
  vendorName,
  month,
  outstanding,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  settlementId: string;
  vendorName: string;
  month: string;
  outstanding: number;
  onRecorded: (amount: number) => void;
}) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState(outstanding > 0 ? String(Math.round(outstanding)) : "");
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount(outstanding > 0 ? String(Math.round(outstanding)) : "");
    setMethod("bank_transfer");
    setReference("");
    setNotes("");
    setError(null);
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await recordPaymentAction({
          settlementId,
          vendorName,
          month,
          amount: parsed,
          method,
          reference,
          notes,
        });
        showToast(`Payment of Rs ${Math.round(parsed).toLocaleString("en-PK")} recorded for ${vendorName}.`, "success");
        onRecorded(parsed);
        reset();
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to record payment";
        setError(message);
        showToast(message, "error");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Record payment" description={`${vendorName} — outstanding fee settlement`}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className={labelClass}>Amount (Rs)</label>
          <input
            type="number"
            min="1"
            step="1"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Method</label>
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Reference (optional)</label>
          <input
            type="text"
            className={inputClass}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction ID, cheque #, etc."
          />
        </div>
        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional context"
          />
        </div>
        {error && <p className="text-xs font-medium text-[var(--danger)]">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

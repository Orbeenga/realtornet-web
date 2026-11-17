"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/lib/toast";
import {
  doubleGatePendingToast,
  validateDoubleGateMessage,
  type DoubleGatePendingNoun,
} from "@/lib/membership-lifecycle-messages";

/* Canonical shared double-gate dialog (U-038 / DEF-U-DOUBLE-GATE-SSOT-001).
   One component for every appeal/application nudge (reactivation requests
   today; reason-bearing rejects and lifecycle confirms later — never add a
   second dialog for a new surface, extend this one's props).
   Gate 1 (pending-check) fires when opening is attempted: a pending item
   toasts the exact copy and the dialog never opens. Gate 2 (message
   validation) fires on submit: a blank message renders inline red and
   blocks client-side. Latest callbacks ride refs so parents may pass
   inline closures without re-triggering the gate effect. */
export interface ConfirmDestructiveDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  messageLabel: string;
  messagePlaceholder?: string;
  confirmLabel: string;
  /** Pure predicate over already-fetched lists. Must never fetch or mutate. */
  checkPending: () => boolean;
  pendingNoun: DoubleGatePendingNoun;
  onConfirm: (message: string) => void | Promise<void>;
  isPending?: boolean;
}

export function ConfirmDestructiveDialog({
  open,
  onClose,
  title,
  description,
  messageLabel,
  messagePlaceholder,
  confirmLabel,
  checkPending,
  pendingNoun,
  onConfirm,
  isPending = false,
}: ConfirmDestructiveDialogProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const checkRef = useRef(checkPending);
  const closeRef = useRef(onClose);
  const nounRef = useRef(pendingNoun);

  // Latest callbacks ride refs so parents may pass inline closures without
  // re-triggering the gate effect below. Synced in an effect (never during
  // render) and declared BEFORE the gate effect so the gate always reads
  // this render's callbacks.
  useEffect(() => {
    checkRef.current = checkPending;
    closeRef.current = onClose;
    nounRef.current = pendingNoun;
  });

  // Per-opening reset via render-time adjustment (the documented pattern for
  // resetting state when a prop changes — never setState inside an effect).
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) {
      setMessage("");
      setError(null);
    }
  }

  // Gate 1: a pending item toasts the exact copy and the dialog never opens
  // (the render guard below returns null synchronously, so there is no flash).
  useEffect(() => {
    if (!open) {
      return;
    }
    if (checkRef.current()) {
      notify.error(doubleGatePendingToast(nounRef.current));
      closeRef.current();
    }
  }, [open]);

  if (!open || checkPending()) {
    return null;
  }

  const submit = () => {
    const validationError = validateDoubleGateMessage(message);
    if (validationError) {
      setError(validationError);
      return;
    }
    void onConfirm(message.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {messageLabel}
          <textarea
            rows={3}
            className="mt-1 min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder={messagePlaceholder}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (error) setError(null);
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isPending} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

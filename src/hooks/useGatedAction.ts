"use client";

/* Runner for the gate registry SSOT (U-052). Owns the gated-action state
   machine: attempt runs Gate 1 (block toasts, dialog never opens), submit
   runs Gate-2 validation (inline errors) then the caller's mutate. Server
   stays authoritative: pending_exists maps to the action's Gate-1 toast,
   anything else surfaces verbatim (UI-008). The dialog is a pure renderer
   of dialogProps — no gate logic inside it. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  extractPendingExists,
  resolveActionSpec,
  resolveStaleViewToast,
  runGate1Checks,
  validateGateFieldValues,
  type ActionGateSpec,
  type Gate1Context,
  type GateActionKind,
  type GateFieldKind,
  type GateFieldValues,
} from "@/lib/gate-registry";
import { notify } from "@/lib/toast";

export interface GatedDialogProps {
  open: boolean;
  title: string;
  description?: string;
  spec: ActionGateSpec;
  values: GateFieldValues;
  errors: Partial<Record<GateFieldKind, string>>;
  typenameTarget: string;
  confirmLabel: string;
  cancelLabel: string;
  isPending: boolean;
  onValueChange: (kind: GateFieldKind, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/* NOTE (TDZ): opts closures that run during render must not read component
   consts declared after the hook call (early returns force hooks above data).
   buildContext/invoke are safe (they run in event handlers, post-render), but
   description/typenameTarget must be plain strings here. Callers needing
   seed-dependent copy compute it beside their JSX (where data exists) from
   gate.seed and spread-override dialogProps. */
export interface UseGatedActionOpts<Seed> {
  buildContext: (seed: Seed) => Gate1Context;
  invoke: (seed: Seed, values: GateFieldValues) => Promise<unknown>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  typenameTarget?: string;
  successToast: string;
  errorFallback: string;
  onSuccess?: (seed: Seed) => void;
}

export interface GatedAction<Seed> {
  attempt: (seed: Seed) => void;
  close: () => void;
  dialogProps: GatedDialogProps;
  isOpen: boolean;
  seed: Seed | null;
}

const EMPTY_VALUES: GateFieldValues = { message: "", reason: "", typename: "" };

export function useGatedAction<Seed>(
  action: GateActionKind,
  opts: UseGatedActionOpts<Seed>,
): GatedAction<Seed> {
  const spec = resolveActionSpec(action);
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [values, setValues] = useState<GateFieldValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<GateFieldKind, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Latest callbacks ride refs so parents may pass inline closures.
  // Synced in an effect (never during render).
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const seedRef = useRef<Seed | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const attempt = useCallback(
    (nextSeed: Seed) => {
      const current = optsRef.current;
      seedRef.current = nextSeed;
      setSeed(nextSeed);
      const toast = runGate1Checks(spec, current.buildContext(nextSeed));
      if (toast !== null) {
        notify.error(toast);
        return;
      }
      if (!spec.dialog) return;
      setValues(EMPTY_VALUES);
      setErrors({});
      setOpen(true);
    },
    [spec],
  );

  const onValueChange = useCallback((kind: GateFieldKind, value: string) => {
    setValues((current) => ({ ...current, [kind]: value }));
    setErrors((current) => {
      if (!current[kind]) return current;
      const next = { ...current };
      delete next[kind];
      return next;
    });
  }, []);

  const onSubmit = useCallback(() => {
    const current = optsRef.current;
    const activeSeed = seedRef.current;
    if (activeSeed === null || activeSeed === undefined) return;
    const target = current.typenameTarget ?? "";
    const trimmed: GateFieldValues = {
      message: values.message.trim(),
      reason: values.reason.trim(),
      typename: values.typename.trim(),
    };
    const fieldErrors = validateGateFieldValues(spec, trimmed, target);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    void current
      .invoke(activeSeed, trimmed)
      .then(() => {
        notify.success(current.successToast);
        setOpen(false);
        setValues(EMPTY_VALUES);
        setErrors({});
        current.onSuccess?.(activeSeed);
      })
      .catch((error: unknown) => {
        const signal = extractPendingExists(error);
        if (signal) {
          const ctx = current.buildContext(activeSeed);
          const mapped = resolveStaleViewToast(spec, signal.kind, ctx.counterpartyName);
          notify.error(mapped ?? current.errorFallback);
          return;
        }
        const detail = error instanceof ApiError ? error.detail : null;
        notify.error(typeof detail === "string" ? detail : current.errorFallback);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [spec, values]);

  return {
    attempt,
    close,
    isOpen: open,
    seed,
    dialogProps: {
      open,
      title: opts.title,
      description: opts.description,
      spec,
      values,
      errors,
      typenameTarget: opts.typenameTarget ?? "",
      confirmLabel: opts.confirmLabel ?? spec.confirmLabel,
      cancelLabel: opts.cancelLabel ?? "Cancel",
      isPending: submitting,
      onValueChange,
      onSubmit,
      onClose: close,
    },
  };
}

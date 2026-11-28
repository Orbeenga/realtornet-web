"use client";

/* Runner for the gate registry SSOT (U-052, step model U-053). Owns the
   gated-action state machine: attempt runs Gate 1 (block toasts, dialog
   never opens), primary advances validated steps, final primary submits.
   Cancel semantics (U-053): first step ends the action; final step returns
   to the reason/message step with text preserved; reason step ends the
   action. Dismissal (X, overlay, Escape) always abandons. Server stays
   authoritative: pending_exists maps to the action's Gate-1 toast, anything
   else surfaces verbatim (UI-008). The dialog is a pure renderer of
   dialogProps — no gate logic inside it. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  extractPendingExists,
  resolveActionSpec,
  resolveStaleViewToast,
  runGate1Checks,
  validateStepFields,
  type ActionGateSpec,
  type Gate1Context,
  type GateActionKind,
  type GateCopyTokens,
  type GateFieldKind,
  type GateFieldValues,
  type GateStepSpec,
} from "@/lib/gate-registry";
import { notify } from "@/lib/toast";

export interface GatedDialogProps {
  open: boolean;
  title: string;
  description?: string;
  spec: ActionGateSpec;
  step: GateStepSpec;
  stepIndex: number;
  stepCount: number;
  stepLabel: string | null;
  values: GateFieldValues;
  errors: Partial<Record<GateFieldKind, string>>;
  typenameTarget: string;
  tokens: GateCopyTokens;
  cancelLabel: string;
  primaryDisabled: boolean;
  isPending: boolean;
  onValueChange: (kind: GateFieldKind, value: string) => void;
  onPrimary: () => void;
  onCancel: () => void;
  onClose: () => void;
}

/* NOTE (TDZ): opts closures that run during render must not read component
   consts declared after the hook call (early returns force hooks above data).
   buildContext/invoke/mapError are safe (event handlers/submit continuations,
   post-render). description must be a plain string; callers needing
   seed-dependent copy compute it beside JSX from gate.seed and
   spread-override dialogProps. The typenameTarget fn form runs during render
   AND submit, so it must be seed-pure (read the seed argument only). */
export interface UseGatedActionOpts<Seed> {
  buildContext: (seed: Seed) => Gate1Context;
  invoke: (seed: Seed, values: GateFieldValues) => Promise<unknown>;
  title: string;
  description?: string;
  cancelLabel?: string;
  /* Seed-dependent target: fn form must be seed-pure (see TDZ note).
     Rendered display ALSO needs the JSX-override from gate.seed
     (dialogProps passes "" for the fn form). */
  typenameTarget?: string | ((seed: Seed) => string);
  successToast: string;
  errorFallback: string;
  onSuccess?: (seed: Seed, result: unknown) => void;
  mapError?: (error: unknown) => string | null;
}

export interface GatedAction<Seed> {
  attempt: (seed: Seed) => void;
  close: () => void;
  /* Tokens are deliberately absent: callers pass them beside JSX (where
     data exists — TDZ note above) and tsc fails the spread without them.
     Actions without templated copy pass tokens={{}} explicitly. */
  dialogProps: Omit<GatedDialogProps, "tokens">;
  isOpen: boolean;
  seed: Seed | null;
}

const EMPTY_VALUES: GateFieldValues = { message: "", reason: "", typename: "", note: "" };

function trimValues(values: GateFieldValues): GateFieldValues {
  return {
    message: values.message.trim(),
    reason: values.reason.trim(),
    typename: values.typename.trim(),
    note: values.note.trim(),
  };
}

export function useGatedAction<Seed>(
  action: GateActionKind,
  opts: UseGatedActionOpts<Seed>,
): GatedAction<Seed> {
  const spec = resolveActionSpec(action);
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
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

  const reset = useCallback(() => {
    setOpen(false);
    setStepIndex(0);
    setValues(EMPTY_VALUES);
    setErrors({});
  }, []);

  const close = useCallback(() => {
    reset();
  }, [reset]);

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
      setStepIndex(0);
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

  const resolveTarget = useCallback(
    (seedValue: Seed | null): string => {
      const current = optsRef.current;
      if (typeof current.typenameTarget === "function") {
        if (seedValue === null || seedValue === undefined) return "";
        return current.typenameTarget(seedValue);
      }
      return current.typenameTarget ?? "";
    },
    [],
  );

  const onPrimary = useCallback(() => {
    const current = optsRef.current;
    const activeSeed = seedRef.current;
    if (activeSeed === null || activeSeed === undefined) return;
    const step = spec.steps[stepIndex];
    if (!step) return;
    const trimmed = trimValues(values);
    const target = resolveTarget(activeSeed);
    const fieldErrors = validateStepFields(step.fields, trimmed, target);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const isLast = stepIndex >= spec.steps.length - 1;
    if (!isLast) {
      setStepIndex(stepIndex + 1);
      return;
    }
    setSubmitting(true);
    void current
      .invoke(activeSeed, trimmed)
      .then((result: unknown) => {
        notify.success(current.successToast);
        reset();
        current.onSuccess?.(activeSeed, result);
      })
      .catch((error: unknown) => {
        const mapped = current.mapError?.(error);
        if (mapped != null) {
          notify.error(mapped);
          return;
        }
        const signal = extractPendingExists(error);
        if (signal) {
          const ctx = current.buildContext(activeSeed);
          const mappedToast = resolveStaleViewToast(spec, signal.kind, ctx.counterpartyName, ctx.viewerIsApplicant);
          notify.error(mappedToast ?? current.errorFallback);
          return;
        }
        const detail = error instanceof ApiError ? error.detail : null;
        notify.error(typeof detail === "string" ? detail : current.errorFallback);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [spec, stepIndex, values, reset, resolveTarget]);

  const onCancel = useCallback(() => {
    // U-053 cancel semantics: final step of a multi-step flow returns to
    // the nearest prior step with input fields (reason/message), with text
    // preserved; every other step (first, intent, fields) ends the action.
    const isLast = stepIndex >= spec.steps.length - 1;
    if (isLast && spec.steps.length > 1) {
      for (let i = stepIndex - 1; i >= 0; i -= 1) {
        if ((spec.steps[i]?.fields.length ?? 0) > 0) {
          setStepIndex(i);
          setErrors({});
          return;
        }
      }
    }
    reset();
  }, [spec, stepIndex, reset]);

  const step = spec.steps[stepIndex] ?? spec.steps[0];
  const stepCount = spec.steps.length;
  // Typename-gated primary (Profile D final): disabled until exact match.
  // Locked exception to the clickable-button rule — the gate IS the match.
  // Reads opts directly (render scope, no ref): the fn form must be
  // seed-pure — it runs here during render, so it must never close over
  // component consts declared after the hook call (TDZ).
  const renderTarget =
    typeof opts.typenameTarget === "function"
      ? seed == null
        ? ""
        : opts.typenameTarget(seed)
      : (opts.typenameTarget ?? "");
  const typenameGated =
    step != null &&
    step.fields.some((f) => f.kind === "typename" && f.required) &&
    values.typename.trim() !== renderTarget;

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
      step: step as GateStepSpec,
      stepIndex,
      stepCount,
      stepLabel: stepCount > 1 ? `Step ${stepIndex + 1} of ${stepCount}` : null,
      values,
      errors,
      typenameTarget:
        typeof opts.typenameTarget === "function" ? "" : (opts.typenameTarget ?? ""),
      cancelLabel: opts.cancelLabel ?? "Cancel",
      primaryDisabled: typenameGated,
      isPending: submitting,
      onValueChange,
      onPrimary,
      onCancel,
      onClose: close,
    },
  };
}

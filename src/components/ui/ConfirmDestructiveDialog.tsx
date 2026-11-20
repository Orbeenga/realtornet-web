"use client";

/* Canonical shared gated-action dialog (U-052; step model U-053).
   Pure renderer: renders the runner's dialogProps plus caller tokens and
   reports intent back. Renders step N of M (indicator on multi-step flows),
   per-step fields, read-only echo of drafted values on review steps, and a
   typename-gated primary on Profile D finals. No gate logic inside — Gate 1
   runs in useGatedAction.attempt (dialog never opens on block), Gate-2
   errors arrive precomputed. One component for every gated action — never
   add a second dialog for a new surface, register the action and let the
   runner drive this one. */

import { Button } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GatedDialogProps } from "@/hooks/useGatedAction";
import {
  resolveCopyTemplate,
  typenameLabel,
  type GateFieldKind,
} from "@/lib/gate-registry";

const FIELD_INPUT_CLASS =
  "mt-1 min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const ECHO_LABEL: Record<string, string> = {
  reason: "Reason",
  message: "Message",
};

function fieldLabel(kind: GateFieldKind, label: string, target: string): string {
  return kind === "typename" ? typenameLabel(target) : label;
}

function fieldPlaceholder(
  kind: GateFieldKind,
  placeholder: string | undefined,
  target: string,
): string | undefined {
  return kind === "typename" ? target : placeholder;
}

export function ConfirmDestructiveDialog({
  open,
  title,
  description,
  spec,
  step,
  stepIndex,
  stepCount,
  stepLabel,
  values,
  errors,
  typenameTarget,
  tokens,
  cancelLabel,
  primaryDisabled,
  isPending,
  onValueChange,
  onPrimary,
  onCancel,
  onClose,
}: GatedDialogProps) {
  if (!open) {
    return null;
  }

  const stepTitle = step.titleTemplate
    ? resolveCopyTemplate(step.titleTemplate, tokens)
    : title;
  const stepBody = step.bodyTemplate
    ? resolveCopyTemplate(step.bodyTemplate, tokens)
    : description;
  // Destructive red marks the write: only the final primary carries it.
  // Intermediate Proceed buttons stay primary even for destructive actions.
  const isLastStep = stepIndex >= stepCount - 1;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          {stepLabel ? (
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {stepLabel}
            </p>
          ) : null}
          <DialogTitle>{stepTitle}</DialogTitle>
          {stepBody ? <DialogDescription>{stepBody}</DialogDescription> : null}
        </DialogHeader>
        {step.fields.map((field) => (
          <div key={field.kind}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {fieldLabel(field.kind, field.label, typenameTarget)}
              {field.kind === "typename" ? (
                <input
                  type="text"
                  className={FIELD_INPUT_CLASS}
                  placeholder={fieldPlaceholder(field.kind, field.placeholder, typenameTarget)}
                  value={values[field.kind]}
                  onChange={(event) => onValueChange(field.kind, event.target.value)}
                />
              ) : (
                <textarea
                  rows={3}
                  className={FIELD_INPUT_CLASS}
                  placeholder={fieldPlaceholder(field.kind, field.placeholder, typenameTarget)}
                  value={values[field.kind]}
                  onChange={(event) => onValueChange(field.kind, event.target.value)}
                />
              )}
            </label>
            {errors[field.kind] ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {errors[field.kind]}
              </p>
            ) : null}
          </div>
        ))}
        {(step.echo ?? []).map((kind) => (
          <div
            key={kind}
            className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {ECHO_LABEL[kind] ?? kind}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{values[kind].trim()}</p>
          </div>
        ))}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={spec.destructive && isLastStep ? "destructive" : "primary"}
            loading={isPending}
            disabled={primaryDisabled}
            onClick={onPrimary}
          >
            {step.primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

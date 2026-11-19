"use client";

/* Canonical shared gated-action dialog (U-052; U-038 shape, U-050 variants).
   Pure renderer: renders the runner's dialogProps and reports intent back.
   No gate logic inside — Gate 1 runs in useGatedAction.attempt (dialog never
   opens on block), Gate-2 errors arrive precomputed. One component for every
   gated action — never add a second dialog for a new surface, register the
   action and let the runner drive this one. */

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
import { typenameLabel, type GateFieldKind } from "@/lib/gate-registry";

const FIELD_INPUT_CLASS =
  "mt-1 min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

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
  values,
  errors,
  typenameTarget,
  confirmLabel,
  cancelLabel,
  isPending,
  onValueChange,
  onSubmit,
  onClose,
}: GatedDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {spec.fields.map((field) => (
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
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={spec.destructive ? "destructive" : "primary"}
            loading={isPending}
            onClick={onSubmit}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

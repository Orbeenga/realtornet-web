"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <Label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </Label>
        ) : null}
        <ShadcnInput
          ref={ref}
          id={inputId}
          className={cn(
            error ? "border-red-500 focus-visible:ring-red-500" : "",
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {hint && !error ? (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

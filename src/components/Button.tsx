"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantMap = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
} as const;

const sizeMap = {
  sm: "sm",
  md: "default",
  lg: "lg",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <ShadcnButton
        ref={ref}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        disabled={disabled || loading}
        className={cn(className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            {children}
          </span>
        ) : (
          children
        )}
      </ShadcnButton>
    );
  },
);

Button.displayName = "Button";

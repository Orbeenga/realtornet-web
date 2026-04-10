import type { ReactNode } from "react";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "outline";
  className?: string;
}

const variantClasses = {
  default: "",
  success:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  outline:
    "border border-gray-300 bg-transparent text-gray-700 dark:text-gray-300",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <ShadcnBadge
      variant={variant === "outline" ? "outline" : "secondary"}
      className={cn(variantClasses[variant], className)}
    >
      {children}
    </ShadcnBadge>
  );
}

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <details data-slot="popover-root" className="group relative inline-flex">
      {children}
    </details>
  )
}

function PopoverTrigger({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <summary
      data-slot="popover-trigger"
      className={cn("list-none marker:hidden [&::-webkit-details-marker]:hidden", className)}
    >
      {children}
    </summary>
  )
}

function PopoverPortal({ children }: { children: React.ReactNode }) {
  return children
}

function PopoverContent({
  className,
  children,
  align = "start",
}: {
  className?: string
  children: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  return (
    <div
      data-slot="popover-content"
      role="dialog"
      className={cn(
        "absolute top-full z-50 mt-2 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none",
        align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverContent, PopoverPortal, PopoverTrigger }

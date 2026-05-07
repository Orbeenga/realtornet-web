"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  rootRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const context = React.useContext(PopoverContext)

  if (!context) {
    throw new Error("Popover components must be used within Popover")
  }

  return context
}

function Popover({
  children,
  className,
  open,
  defaultOpen = false,
  onOpenChange,
}: {
  children: React.ReactNode
  className?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isOpen = open ?? internalOpen
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [onOpenChange],
  )

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target

      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, setOpen])

  return (
    <PopoverContext.Provider value={{ open: isOpen, setOpen, rootRef }}>
      <div
        ref={rootRef}
        data-slot="popover-root"
        data-state={isOpen ? "open" : "closed"}
        className={cn("relative inline-flex", className)}
      >
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const { open, setOpen } = usePopoverContext()

  return (
    <button
      type="button"
      data-slot="popover-trigger"
      aria-expanded={open}
      className={className}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
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
  const { open } = usePopoverContext()

  if (!open) {
    return null
  }

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

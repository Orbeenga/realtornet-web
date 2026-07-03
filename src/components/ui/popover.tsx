"use client"

import * as React from "react"
import { createPortal } from "react-dom"

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
  asChild = false,
}: {
  className?: string
  children: React.ReactNode
  asChild?: boolean
}) {
  const { open, setOpen } = usePopoverContext()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      'data-slot': 'popover-trigger',
      'aria-expanded': open,
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e)
        setOpen(!open)
      },
    })
  }

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
  if (typeof window === "undefined") return null
  return createPortal(children, document.body)
}

function PopoverContent({
  className,
  children,
  align = "start",
  sideOffset = 4,
}: {
  className?: string
  children: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  const { open, rootRef } = usePopoverContext()
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })

  React.useEffect(() => {
    if (!open || !rootRef.current) return

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return

      const scrollY = window.scrollY || window.pageYOffset
      const scrollX = window.scrollX || window.pageXOffset

      let left = rect.left
      let width = rect.width

      if (align === "end") {
        left = rect.right - width
      } else if (align === "center") {
        left = rect.left + rect.width / 2 - width / 2
      }

      setPosition({
        top: rect.bottom + scrollY + sideOffset,
        left: left + scrollX,
        width: Math.max(width, 200),
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition)
    }
  }, [open, rootRef, align, sideOffset])

  if (!open) {
    return null
  }

  return (
    <PopoverPortal>
      <div
        data-slot="popover-content"
        role="dialog"
        className={cn(
          "fixed z-50 rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-lg outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
          className,
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
        }}
      >
        {children}
      </div>
    </PopoverPortal>
  )
}

export { Popover, PopoverContent, PopoverPortal, PopoverTrigger }

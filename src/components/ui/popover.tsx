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
    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void
      'data-slot'?: string
      'aria-expanded'?: boolean
    }>
    return React.cloneElement(child, {
      'data-slot': 'popover-trigger',
      'aria-expanded': open,
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event)
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

// useLayoutEffect on the client so the popover is positioned before paint
// (no visible flash at 0,0); falls back to useEffect during SSR to avoid the
// React warning. The content is only rendered when `open` is true, which only
// happens after a user interaction, so positioning never runs on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

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
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{ top: number; left: number; ready: boolean }>({
    top: 0,
    left: 0,
    ready: false,
  })

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setPosition({ top: 0, left: 0, ready: false })
      return
    }

    const updatePosition = () => {
      const trigger = rootRef.current
      const content = contentRef.current
      if (!trigger || !content) return

      // Both rects are viewport-relative, which is exactly what `position: fixed`
      // expects. Do NOT add window.scrollY/scrollX here — that was the bug that
      // caused dropdown content to detach and float when the page was scrolled.
      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      if (triggerRect.width === 0 && triggerRect.height === 0) return

      const contentWidth = contentRect.width
      let left = triggerRect.left

      if (align === "end") {
        left = triggerRect.right - contentWidth
      } else if (align === "center") {
        left = triggerRect.left + triggerRect.width / 2 - contentWidth / 2
      }

      // Keep the panel inside the viewport so wide content (e.g. the w-80
      // notification panel anchored to the right-edge bell) never overflows.
      const margin = 8
      const maxLeft = window.innerWidth - contentWidth - margin
      left = Math.max(margin, Math.min(left, maxLeft))

      setPosition({
        top: triggerRect.bottom + sideOffset,
        left,
        ready: true,
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open, rootRef, align, sideOffset])

  if (!open) {
    return null
  }

  return (
    <PopoverPortal>
      <div
        ref={contentRef}
        data-slot="popover-content"
        role="dialog"
        className={cn(
          "fixed z-50 rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-lg outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
          className,
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          // Hide until the first position calculation lands so the panel never
          // flashes at the viewport origin. With useIsomorphicLayoutEffect this
          // happens before paint on the client.
          visibility: position.ready ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </PopoverPortal>
  )
}

export { Popover, PopoverContent, PopoverPortal, PopoverTrigger }

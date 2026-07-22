"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  rootRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
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
  // contentRef is created here and shared via context so the outside-click
  // handler can check if the click landed inside the floating panel (which
  // is portalled to document.body and therefore outside rootRef).
  const contentRef = React.useRef<HTMLDivElement>(null)
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
      const target = event.target as Node | null
      if (!target) return

      // The trigger wrapper and the floating content panel are the two
      // legitimate hit-test zones. Clicks inside either must not close the
      // popover. The content panel is portalled to document.body so it is
      // outside rootRef — we must check contentRef separately.
      const insideTrigger = rootRef.current?.contains(target) ?? false
      const insideContent = contentRef.current?.contains(target) ?? false

      if (!insideTrigger && !insideContent) {
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
    <PopoverContext.Provider value={{ open: isOpen, setOpen, rootRef, contentRef }}>
      <div
        ref={rootRef}
        data-slot="popover-root"
        data-state={isOpen ? "open" : "closed"}
        className={cn("relative flex", className)}
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
  asSheet = false,
  matchTriggerWidth = false,
}: {
  className?: string
  children: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
  /**
   * When true, the content renders as a bottom-anchored sheet (full viewport
   * width, fixed to the bottom edge). Used for the mobile Property Type picker.
   */
  asSheet?: boolean
  /**
   * When true, the popover width matches the trigger element width exactly.
   */
  matchTriggerWidth?: boolean
}) {
  const { open, setOpen, rootRef, contentRef } = usePopoverContext()
  // Lock body scroll while the sheet is open so the page behind doesn't scroll
  useBodyScrollLock(open && !!asSheet)
  const positionReady = React.useRef(false)

  // Direct DOM manipulation avoids the one-frame lag of React state during
  // scroll — position is applied synchronously in the scroll handler.
  const applyPosition = React.useCallback(() => {
    if (asSheet) return
    const trigger = rootRef.current
    const content = contentRef.current
    if (!trigger || !content) return

    const triggerRect = trigger.getBoundingClientRect()
    if (triggerRect.width === 0 && triggerRect.height === 0) return

    const contentRect = content.getBoundingClientRect()
    const contentWidth = contentRect.width
    const contentHeight = contentRect.height

    let left = triggerRect.left
    if (align === "end") {
      left = triggerRect.right - contentWidth
    } else if (align === "center") {
      left = triggerRect.left + triggerRect.width / 2 - contentWidth / 2
    }

    const margin = 8
    const maxLeft = window.innerWidth - contentWidth - margin
    left = Math.max(margin, Math.min(left, maxLeft))

    const spaceBelow = window.innerHeight - triggerRect.bottom
    const spaceAbove = triggerRect.top
    const fitsBelow = spaceBelow >= contentHeight + sideOffset
    const fitsAbove = spaceAbove >= contentHeight + sideOffset
    const positionAbove = !fitsBelow && fitsAbove
    const top = positionAbove
      ? triggerRect.top - contentHeight - sideOffset
      : triggerRect.bottom + sideOffset
    const available = positionAbove
      ? spaceAbove - sideOffset
      : spaceBelow - sideOffset

    if (matchTriggerWidth) {
      content.style.width = `${triggerRect.width}px`
    }
    content.style.top = `${top}px`
    content.style.left = `${left}px`
    content.style.maxHeight = `${Math.min(contentHeight, available)}px`
    content.style.overflow = contentHeight > available ? 'hidden' : ''
    content.style.visibility = "visible"

    if (contentHeight > available) {
      const list = content.querySelector('ul')
      if (list) {
        const headerH = list.previousElementSibling?.getBoundingClientRect().height ?? 0
        const footerH = list.nextElementSibling?.getBoundingClientRect().height ?? 0
        ;(list as HTMLElement).style.maxHeight = `${Math.max(60, available - headerH - footerH)}px`
      }
    }

    positionReady.current = true
  }, [asSheet, rootRef, contentRef, align, sideOffset, matchTriggerWidth])

  useIsomorphicLayoutEffect(() => {
    const content = contentRef.current
    if (!open) {
      if (content) content.style.visibility = "hidden"
      positionReady.current = false
      return
    }
    if (asSheet) return

    applyPosition()
    window.addEventListener("resize", applyPosition)

    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          applyPosition()
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("resize", applyPosition)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [open, rootRef, contentRef, align, sideOffset, asSheet, matchTriggerWidth, applyPosition])

  if (!open) {
    return null
  }

  if (asSheet) {
    // Bottom sheet mode: full-width panel anchored to the viewport bottom.
    // Used on mobile where a top-anchored popover is too small.
    return (
      <PopoverPortal>
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setOpen(false)}
        />
        <div
          ref={contentRef}
          data-slot="popover-content"
          role="dialog"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white text-gray-900 shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
            className,
            "w-full max-h-[75vh] flex flex-col",
          )}
        >
          {children}
        </div>
      </PopoverPortal>
    )
  }

  return (
    <PopoverPortal>
      <div
        ref={contentRef}
        data-slot="popover-content"
        role="dialog"
        className={cn(
          "invisible fixed z-50 rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-lg outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
          className,
        )}
        style={{ top: 0, left: 0 }}
      >
        {children}
      </div>
    </PopoverPortal>
  )
}

export { Popover, PopoverContent, PopoverPortal, PopoverTrigger }

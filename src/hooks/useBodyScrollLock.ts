"use client";

import { useEffect } from "react";

/**
 * Locks document body scroll while `active` is true, restoring the previous
 * overflow value on deactivation or unmount.
 *
 * Can be called by any component (Popover sheet, Dialog, etc.) — a single
 * hook per open overlay is sufficient since only one overlay is typically
 * open at a time.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

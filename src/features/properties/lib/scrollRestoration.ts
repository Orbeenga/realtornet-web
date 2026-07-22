"use client";

const PROPERTIES_SCROLL_STORAGE_PREFIX = "rn:properties-scroll";

/** Skip scroll restoration if current position is within this many pixels of the saved target. Avoids visible jumps when the user hasn't meaningfully moved during a filter commit. */
const SCROLL_RESTORE_THRESHOLD = 50;

function buildPropertiesScrollStorageKey(url: string) {
  return `${PROPERTIES_SCROLL_STORAGE_PREFIX}:${url}`;
}

export function savePropertiesScrollPosition(url: string, scrollY?: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    buildPropertiesScrollStorageKey(url),
    String(scrollY ?? window.scrollY),
  );
}

export function restorePropertiesScrollPosition(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const storageKey = buildPropertiesScrollStorageKey(url);
  const storedScrollPosition = window.sessionStorage.getItem(storageKey);

  if (storedScrollPosition === null) {
    return false;
  }

  const scrollTop = Number(storedScrollPosition);
  window.sessionStorage.removeItem(storageKey);

  if (Number.isNaN(scrollTop)) {
    return false;
  }

  window.requestAnimationFrame(() => {
    const currentY = window.scrollY;
    if (Math.abs(currentY - scrollTop) < SCROLL_RESTORE_THRESHOLD) {
      return;
    }
    window.scrollTo({ top: scrollTop, behavior: "auto" });
  });

  return true;
}

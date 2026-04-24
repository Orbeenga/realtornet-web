"use client";

const PROPERTIES_SCROLL_STORAGE_PREFIX = "rn:properties-scroll";

function buildPropertiesScrollStorageKey(url: string) {
  return `${PROPERTIES_SCROLL_STORAGE_PREFIX}:${url}`;
}

export function savePropertiesScrollPosition(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    buildPropertiesScrollStorageKey(url),
    String(window.scrollY),
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
    window.scrollTo({ top: scrollTop, behavior: "auto" });
  });

  return true;
}

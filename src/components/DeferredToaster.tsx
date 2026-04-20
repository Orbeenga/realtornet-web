"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(
  () => import("@/components/Toast").then((module) => module.Toaster),
  { ssr: false },
);

const TOAST_EVENT = "realtornet:toast-needed";

export function requestToasterMount() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TOAST_EVENT));
}

export function DeferredToaster() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    const enable = () => setShouldRender(true);
    const idleCallback =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(enable, { timeout: 2500 })
        : window.setTimeout(enable, 1500);

    window.addEventListener(TOAST_EVENT, enable);
    window.addEventListener("pointerdown", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });

    return () => {
      if (typeof idleCallback === "number") {
        window.clearTimeout(idleCallback);
      } else {
        window.cancelIdleCallback?.(idleCallback);
      }

      window.removeEventListener(TOAST_EVENT, enable);
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
  }, [shouldRender]);

  return shouldRender ? <Toaster /> : null;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function PublicGuidePopover() {
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    try {
      const dismissed = localStorage.getItem("rn_guide_dismissed");
      if (!dismissed) {
        const t = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      /* noop */
    }
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem("rn_guide_dismissed", "1");
    } catch {}
  };

  return (
    <div className="relative">
      {/* Desktop: hover group; Mobile: click */}
      <div
        className="hidden md:block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20 hover:text-white"
          aria-label="How RealtorNet works"
        >
          <HelpCircle className="h-4 w-4" />
          <span>How it works</span>
        </button>
        {open ? <PopoverContent onDismiss={handleDismiss} /> : null}
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20 hover:text-white"
          aria-label="How RealtorNet works"
          aria-expanded={open}
        >
          <HelpCircle className="h-4 w-4" />
          <span>How it works</span>
        </button>
        {open ? <PopoverContent onDismiss={handleDismiss} /> : null}
      </div>
    </div>
  );
}

function PopoverContent({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute z-50 mt-3 w-80 rounded-2xl border border-white/10 bg-white/95 p-5 shadow-2xl backdrop-blur dark:border-gray-700/50 dark:bg-gray-950/90 sm:w-96">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-300">
          Public hierarchy
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="Dismiss guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <h2 className="mt-3 text-xl font-bold leading-tight text-gray-950 dark:text-white">
        Agencies to listings to agents
      </h2>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
        Start with a trusted organization, compare its active inventory, then
        contact the agent accountable for the listing.
      </p>
      <div className="mt-4 space-y-3">
        {[
          "Choose a verified agency",
          "Review its active listings",
          "Contact the listing agent",
        ].map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm dark:bg-gray-900"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

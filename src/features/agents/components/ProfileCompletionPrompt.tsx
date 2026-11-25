"use client";

import Link from "next/link";
import {
  PROFILE_COMPLETION_HEADLINE,
  formatMissingProfileField,
} from "@/features/agents/lib/profile-completeness";

interface ProfileCompletionPromptProps {
  /** Served `profile_complete` flag — the only completeness input. */
  profileComplete: boolean;
  /** Served `profile_missing_fields` tokens, in server order. */
  missingFields: string[];
  /** Hide the self-referential link when rendered on the profile page. */
  showProfileLink?: boolean;
}

/**
 * B3 profile-completion prompt + checklist (UI-007 shared primitive).
 *
 * Non-dismissible by design: no dismiss affordance exists, and the banner
 * renders whenever the served `profile_complete` flag is false. Mounted on
 * the agent dashboard and the profile page.
 */
export function ProfileCompletionPrompt({
  profileComplete,
  missingFields,
  showProfileLink = true,
}: ProfileCompletionPromptProps) {
  if (profileComplete) {
    return null;
  }

  return (
    <section
      aria-label="Profile completion required"
      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
    >
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        {PROFILE_COMPLETION_HEADLINE}
      </p>
      <ul className="space-y-1.5">
        {missingFields.map((field) => (
          <li
            key={field}
            className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full border border-amber-500"
            />
            <span>Missing: {formatMissingProfileField(field)}</span>
          </li>
        ))}
      </ul>
      {showProfileLink ? (
        <Link
          href="/account/profile#agent-profile-repair"
          className="inline-block text-sm font-medium text-amber-800 underline underline-offset-4 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
        >
          Go to your profile
        </Link>
      ) : null}
    </section>
  );
}

/**
 * B3 profile-completion display helpers.
 *
 * The backend is the single source of truth for completeness: endpoints serve
 * `profile_complete` + `profile_missing_fields` (one shared helper, no N+1).
 * This module only maps the served missing-field tokens to human labels for
 * the prompt/checklist — it never decides completeness itself. Unknown tokens
 * render verbatim so a future server-side field can never vanish from the
 * checklist.
 */

export const PROFILE_COMPLETION_HEADLINE =
  "Complete your profile to be able to submit listings for review.";

/** Display labels mirroring backend PROFILE_MISSING_LABELS (display only). */
const MISSING_FIELD_LABELS: Record<string, string> = {
  display_name: "display name",
  phone: "phone number",
  company_or_specialization: "company or specialization",
};

export function formatMissingProfileField(token: string): string {
  return MISSING_FIELD_LABELS[token] ?? token;
}

export interface UserMeRepairInput {
  first_name: string;
  last_name: string;
  phone_number: string;
}

export interface AgentProfileRepairInput {
  company_name: string;
  specialization: string;
}

/* Repair payloads (B3): both update endpoints apply exclude_unset, so blank
   optionals are omitted (never nulled) and names are trimmed. The form
   requires non-blank names and at least one of company/specialization; the
   builders stay total so checks can pin the omit-empty contract. */
export function buildUserMeRepairPayload(input: UserMeRepairInput): {
  first_name: string;
  last_name: string;
  phone_number?: string;
} {
  const payload: { first_name: string; last_name: string; phone_number?: string } = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
  };
  const phone = input.phone_number.trim();
  if (phone !== "") {
    payload.phone_number = phone;
  }
  return payload;
}

export function buildAgentProfileRepairPayload(input: AgentProfileRepairInput): {
  company_name?: string;
  specialization?: string;
} {
  const payload: { company_name?: string; specialization?: string } = {};
  const company = input.company_name.trim();
  if (company !== "") {
    payload.company_name = company;
  }
  const specialization = input.specialization.trim();
  if (specialization !== "") {
    payload.specialization = specialization;
  }
  return payload;
}

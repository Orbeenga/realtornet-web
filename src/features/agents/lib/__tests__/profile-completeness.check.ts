/**
 * B3 profile-completion display checks: the served missing-field tokens map
 * to the exact labels the backend gate message uses, and unknown tokens pass
 * through verbatim so a new server-side field never vanishes from the
 * checklist.
 *
 * Run: pnpm exec tsx src/features/agents/lib/__tests__/profile-completeness.check.ts
 */
import {
  PROFILE_COMPLETION_HEADLINE,
  buildAgentProfileRepairPayload,
  buildUserMeRepairPayload,
  formatMissingProfileField,
} from "@/features/agents/lib/profile-completeness";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  PROFILE_COMPLETION_HEADLINE ===
    "Complete your profile to be able to submit listings for review.",
  "prompt headline matches the locked B3 copy",
);
assert(
  formatMissingProfileField("display_name") === "display name",
  "display_name maps to the server gate label",
);
assert(
  formatMissingProfileField("phone") === "phone number",
  "phone maps to the server gate label",
);
assert(
  formatMissingProfileField("company_or_specialization") ===
    "company or specialization",
  "company_or_specialization maps to the server gate label",
);
assert(
  formatMissingProfileField("2031_future_field") === "2031_future_field",
  "unknown tokens render verbatim (fail-open display)",
);
assert(
  JSON.stringify(
    buildUserMeRepairPayload({ first_name: " Ada ", last_name: " Eze ", phone_number: "" }),
  ) === JSON.stringify({ first_name: "Ada", last_name: "Eze" }),
  "user repair payload trims names and omits blank phone (exclude_unset)",
);
assert(
  JSON.stringify(
    buildUserMeRepairPayload({
      first_name: "Ada",
      last_name: "Eze",
      phone_number: " 0800 ",
    }),
  ) ===
    JSON.stringify({ first_name: "Ada", last_name: "Eze", phone_number: "0800" }),
  "user repair payload keeps a provided phone",
);
assert(
  JSON.stringify(
    buildAgentProfileRepairPayload({ company_name: " ", specialization: " Sales " }),
  ) === JSON.stringify({ specialization: "Sales" }),
  "agent repair payload omits blank company, keeps specialization",
);
assert(
  JSON.stringify(buildAgentProfileRepairPayload({ company_name: "", specialization: "" })) ===
    JSON.stringify({}),
  "agent repair payload with both blank sends no keys (form blocks first)",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll profile-completeness checks passed.");

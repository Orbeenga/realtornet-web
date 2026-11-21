/**
 * Invitation-reject checks (Tier-1 invitations crossover): the seeker
 * rejected-card sentence comes from the shared invitation resolver
 * (membership-lifecycle-messages.ts), never from inline card copy.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/invitation-reject.check.ts
 */
import { resolveInvitationRejectedSeekerText } from "@/lib/membership-lifecycle-messages";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

// 1. Verbatim seeker sentence: rejection ends the invitation, the normal
//    route stays open (U-041 addendum model).
assert(
  resolveInvitationRejectedSeekerText({ agencyName: "Apine Real Estate" }) ===
    "You rejected the invitation from Apine Real Estate. You can apply to join them any time from Find an Agency.",
  "rejected seeker text is verbatim with agency name",
);

// 2. Missing agency name falls back per module precedent ("this agency").
assert(
  resolveInvitationRejectedSeekerText({}) ===
    "You rejected the invitation from this agency. You can apply to join them any time from Find an Agency.",
  "rejected seeker text falls back without a name",
);
assert(
  resolveInvitationRejectedSeekerText({ agencyName: null }) ===
    "You rejected the invitation from this agency. You can apply to join them any time from Find an Agency.",
  "rejected seeker text falls back on null",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll invitation-reject checks passed.");

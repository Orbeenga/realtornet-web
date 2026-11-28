/**
 * Invitation-reject checks (Tier-1 invitations crossover): the seeker
 * rejected-card sentence resolves through the central pair-ambient
 * dispatcher (kind invitation-rejected), never from inline card copy.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/invitation-reject.check.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// 1. Verbatim seeker sentence, per the ambient matrix: rejection ends
//    the invitation, the normal route stays open (U-041 addendum model).
assert(
  resolveInvitationRejectedSeekerText({ agencyName: "Apine Real Estate" }) ===
    "you have rejected membership invitation from Apine Real Estate. You can apply to join them any time from Find an Agency.",
  "rejected seeker text is verbatim with agency name",
);

// 2. Missing agency name falls back per module precedent ("this agency").
assert(
  resolveInvitationRejectedSeekerText({}) ===
    "you have rejected membership invitation from this agency. You can apply to join them any time from Find an Agency.",
  "rejected seeker text falls back without a name",
);
assert(
  resolveInvitationRejectedSeekerText({ agencyName: null }) ===
    "you have rejected membership invitation from this agency. You can apply to join them any time from Find an Agency.",
  "rejected seeker text falls back on null",
);

// 3. Terminal card carries no action: the rejected-invitation branch
//    renders no Apply Again link (U-041 addendum model — the route
//    itself stays open via Find an Agency, not via the card).
const clientSource = readFileSync(
  join(process.cwd(), "src", "features", "agencies", "components", "MyJoinRequestsClient.tsx"),
  "utf8",
);
const rejectedStart = clientSource.indexOf('invitationSubTab === "rejected"');
const expiredStart = clientSource.indexOf('invitationSubTab === "expired"', rejectedStart);
assert(
  rejectedStart !== -1 && expiredStart !== -1 && expiredStart > rejectedStart,
  "rejected invitation branch bounds found",
);
const rejectedBranch = clientSource.slice(rejectedStart, expiredStart);
assert(
  !rejectedBranch.includes("Apply Again"),
  "rejected invitation card offers no Apply Again",
);
assert(
  rejectedBranch.includes("resolvePairAmbient") && rejectedBranch.includes('kind: "invitation-rejected"'),
  "rejected invitation card routes ambient through the central dispatcher",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll invitation-reject checks passed.");

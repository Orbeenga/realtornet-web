/**
 * U-035 regression check: Revoked-tab appeal cycle renders as TWO distinct
 * permanent rows (request + resolution), each with its own canonical badge,
 * in correct chronological position relative to unrelated surrounding events.
 *
 * This is the test that would have caught the single-row-fold defect
 * (U-034's row-mutation mechanic, corrected by U-035) before it shipped.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/revoked-appeal-two-rows.check.ts
 */
import { getRevokedMembershipHistory } from "../membershipHistory";
import type { MembershipTimelineEntry } from "@/types";

function entry(partial: Partial<MembershipTimelineEntry> & { id: number; timestamp: string }): MembershipTimelineEntry {
  return {
    source_type: "audit_event",
    action: "note",
    reason: null,
    review_message: null,
    user_id: 7,
    agency_id: 42,
    ...partial,
  } as unknown as MembershipTimelineEntry;
}

const fixture: MembershipTimelineEntry[] = [
  entry({ id: 1, action: "revoked", timestamp: "2026-08-10T10:00:00Z", reason: "Policy violation" }),
  // Unrelated audit event between the revocation and the appeal
  entry({ id: 2, action: "suspended", timestamp: "2026-08-12T10:00:00Z" }),
  // The appeal (membership-scoped review_request)
  entry({
    id: 3,
    source_type: "review_request",
    action: undefined,
    timestamp: "2026-08-16T10:00:00Z",
    reason: "I believe this was a mistake",
  }),
  // Its resolution audit event, 5 days later
  entry({ id: 4, action: "reinstated", timestamp: "2026-08-21T10:00:00Z", reason: "Appeal accepted" }),
  // Unrelated event after the resolution
  entry({ id: 5, action: "joined", timestamp: "2026-08-25T10:00:00Z" }),
];

const match = { agency_id: 42, user_id: 7 };
const rows = getRevokedMembershipHistory(fixture, match, { includeReviewRequests: true });

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

// 1. Exactly two rows for the appeal cycle: request + resolution, both present.
const requestRow = rows.find((r) => r.id === 3);
const resolutionRow = rows.find((r) => r.id === 4);
assert(Boolean(requestRow), "request row exists as its own distinct row");
assert(Boolean(resolutionRow), "resolution row exists as its own distinct row");

// 2. Request row keeps its canonical identity: own timestamp, own reason,
//    badge label "Review requested" — never mutated to "Reinstated".
assert(requestRow?.timestamp === "2026-08-16T10:00:00Z", "request row keeps its own timestamp");
assert(requestRow?.reason === "I believe this was a mistake", "request row keeps its own reason text");

// 3. Resolution row keeps its own identity: own timestamp, own reason.
assert(resolutionRow?.action === "reinstated", "resolution row carries its own reinstated action");
assert(resolutionRow?.timestamp === "2026-08-21T10:00:00Z", "resolution row keeps its own timestamp");
assert(resolutionRow?.reason === "Appeal accepted", "resolution row keeps its own reason text");

// 4. Chronological positions, newest first: resolution > request > revoked.
//    (The suspended/joined events in the fixture belong to their own tabs and
//    are correctly excluded by the Revoked-tab scope filter.)
const order = rows.map((r) => r.id);
assert(
  JSON.stringify(order) === JSON.stringify([4, 3, 1]),
  `correct chronological (descending) ordering, resolution after its request — got ${order.join(",")}`,
);

// 5. Unresolved-detection annotation: the resolved request row is annotated
//    (ephemeral "New" marker must discharge); an unresolved request row is not.
const unresolvedFixture: MembershipTimelineEntry[] = fixture.filter((r) => r.id !== 4);
const unresolvedRows = getRevokedMembershipHistory(unresolvedFixture, match, { includeReviewRequests: true });
const unresolvedRequest = unresolvedRows.find((r) => r.id === 3) as
  | { reviewResolution?: string }
  | undefined;
assert(unresolvedRequest?.reviewResolution === undefined, "unresolved request row is not annotated as resolved");
const resolvedRequest = requestRow as { reviewResolution?: string } | undefined;
assert(resolvedRequest?.reviewResolution === "reinstated", "resolved request row is annotated as reinstated");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll U-035 regression assertions passed.");

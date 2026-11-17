/**
 * F4 Rejected-rebuild checks: the canonical reconsideration-appeal matcher
 * (§2.3 agency ambient record — latest linked review_request row per card).
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/rejected-reconsideration.check.ts
 */
import { findLatestReconsiderationReview } from "@/lib/membership-lifecycle-messages";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

interface ReviewRow {
  id: number;
  source_type?: string | null;
  join_request_id?: number | null;
  message?: string | null;
}

// 1. Empty queue: no ambient.
assert(
  findLatestReconsiderationReview([], [7]) === undefined,
  "empty queue yields no reconsideration record",
);

// 2. Wrong source table rows never match (merged-queue discriminator).
assert(
  findLatestReconsiderationReview(
    [{ id: 1, source_type: "join_request", join_request_id: 7, message: "Reapply" }],
    [7],
  ) === undefined,
  "join_request rows are ignored (source discriminator)",
);
assert(
  findLatestReconsiderationReview(
    [{ id: 2, source_type: "membership_review_request", join_request_id: 7, message: "Appeal" }],
    [7],
  ) === undefined,
  "membership_review_request rows are ignored (source discriminator)",
);

// 3. Origin linkage: null or foreign join_request_id never matches.
assert(
  findLatestReconsiderationReview(
    [{ id: 3, source_type: "review_request", join_request_id: null, message: "No link" }],
    [7],
  ) === undefined,
  "unlinked review rows are ignored (null join_request_id)",
);
assert(
  findLatestReconsiderationReview(
    [{ id: 4, source_type: "review_request", join_request_id: 99, message: "Foreign" }],
    [7],
  ) === undefined,
  "review rows for other requests are ignored (foreign join_request_id)",
);

// 4. Linked row matches, with its message intact for the ambient record.
const linked: ReviewRow[] = [
  { id: 5, source_type: "review_request", join_request_id: 7, message: "Please reconsider" },
];
const found = findLatestReconsiderationReview(linked, [7, 8]);
assert(found?.id === 5, "linked review row matches its card");
assert(found?.message === "Please reconsider", "requester message rides through for the ambient");

// 5. Latest by id wins when several appeals exist for the card.
const multi: ReviewRow[] = [
  { id: 6, source_type: "review_request", join_request_id: 7, message: "First" },
  { id: 9, source_type: "review_request", join_request_id: 8, message: "Second" },
  { id: 7, source_type: "review_request", join_request_id: 7, message: "Third" },
];
assert(
  findLatestReconsiderationReview(multi, [7, 8])?.id === 9,
  "latest appeal by id wins across the card's requests",
);

// 6. Accepts a Set as well as an array.
assert(
  findLatestReconsiderationReview(linked, new Set([7]))?.id === 5,
  "matcher accepts a ReadonlySet of ids",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll rejected-reconsideration checks passed.");

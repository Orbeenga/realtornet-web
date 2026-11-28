/**
 * Cumulative request-lifecycle emitter checks: lineage filtering, U-034b
 * terminal discriminator, chronological order, and message mapping.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/cumulative-request-lifecycle.check.ts
 */
import {
  resolveCumulativeRequestLifecycleTimeline,
  resolveExpiredNarrativeTimeline,
  resolveExpiredPairBadgeStatus,
  timelineEntryKey,
  type CumulativeRequestMatch,
} from "../membershipHistory";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function request(partial: Partial<CumulativeRequestMatch> & { join_request_id: number }): CumulativeRequestMatch {
  return {
    status: "cancelled",
    submitted_at: "2026-09-01T10:00:00Z",
    created_at: "2026-09-01T10:00:00Z",
    agency_id: 42,
    agency_name: "Staging Test Agency",
    user_id: 7,
    ...partial,
  };
}

// 1. Cancelled lineage: submitted + cancelled rows only. Approved rows,
//    reactivation rows, and unrelated pendings never leak in.
const cancelled = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 1, status: "cancelled", cancel_reason: "Changed mind", decided_at: "2026-09-02T10:00:00Z", cover_note: "Hello" }),
    request({ join_request_id: 2, status: "approved", submitted_at: "2026-09-03T10:00:00Z", created_at: "2026-09-03T10:00:00Z", decided_at: "2026-09-04T10:00:00Z" }),
    request({ join_request_id: 3, status: "pending", submitted_at: "2026-09-05T10:00:00Z", created_at: "2026-09-05T10:00:00Z", reapplication_message: "Trying again" }),
    request({ join_request_id: 4, status: "pending", submitted_at: "2026-09-06T10:00:00Z", created_at: "2026-09-06T10:00:00Z" }),
  ],
  { kind: "cancelled" },
);
assert(
  cancelled.entries.length === 3,
  `cancelled card holds submitted+cancelled+reapply only, got ${cancelled.entries.length} entries`,
);
assert(
  cancelled.entries.filter((e) => e.action === "cancelled").length === 1,
  "exactly one cancelled decision row",
);
assert(cancelled.terminal === false, "cancelled groups are never terminal");
const submittedAnchor = cancelled.entries.find((e) => e.source_type === "join_request" && e.cover_note === "Hello");
assert(submittedAnchor !== undefined, "cover note rides the submitted anchor verbatim");
const cancelRow = cancelled.entries.find((e) => e.action === "cancelled");
assert(cancelRow?.reason === "Changed mind", "cancel reason rides the decision row verbatim");
const reapplyAnchor = cancelled.entries.find(
  (e) => e.source_type === "join_request" && (e as { isPendingReapply?: boolean }).isPendingReapply === true,
);
assert(reapplyAnchor !== undefined, "pending reapply submission row is annotated isPendingReapply");

// 2. Global chronological ascending order across the whole card.
const timestamps = cancelled.entries.map((e) => new Date(e.timestamp).getTime());
const ordered = [...timestamps].sort((a, b) => a - b);
assert(
  JSON.stringify(timestamps) === JSON.stringify(ordered),
  "entries are in one global chronological (ascending) order",
);

// 3. Fresh single rejection: non-terminal, appeal CTA available.
const fresh = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 10, status: "rejected", rejection_reason: "No fit", decided_at: "2026-09-02T10:00:00Z" }),
  ],
  { kind: "rejected" },
);
assert(fresh.terminal === false, "single fresh rejection is non-terminal");
assert(fresh.hasReturningAppealRejection === false, "no returning-appeal discriminator on fresh rows");
assert(
  fresh.entries.some((e) => e.action === "rejected" && e.reason === "No fit"),
  "rejection reason recorded inline on the decision row",
);

// 4. Second rejection: terminal no-op.
const second = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 10, status: "rejected", decided_at: "2026-09-02T10:00:00Z" }),
    request({ join_request_id: 11, status: "rejected", submitted_at: "2026-09-10T10:00:00Z", created_at: "2026-09-10T10:00:00Z", decided_at: "2026-09-11T10:00:00Z", reapplied_from_request_id: 10 }),
  ],
  { kind: "rejected" },
);
assert(second.terminal === true, "second rejection is terminal");

// 5. Returning-appeal rejection: terminal immediately (U-013 discriminator).
const returning = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 20, status: "rejected", decided_at: "2026-09-02T10:00:00Z", reactivation_requested_at: "2026-09-01T10:00:00Z" }),
  ],
  { kind: "rejected" },
);
assert(returning.terminal === true, "returning-appeal rejection is immediately terminal");
assert(returning.hasReturningAppealRejection === true, "returning-appeal flag is set");

// 6. Rejection + pending reapply (not yet re-rejected): non-terminal.
const awaiting = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 30, status: "rejected", decided_at: "2026-09-02T10:00:00Z" }),
    request({ join_request_id: 31, status: "pending", submitted_at: "2026-09-10T10:00:00Z", created_at: "2026-09-10T10:00:00Z", reapplication_message: "Again" }),
  ],
  { kind: "rejected" },
);
assert(awaiting.terminal === false, "rejection with a pending (not yet re-rejected) reapply stays non-terminal");
assert(
  awaiting.entries.every((e) => e.action !== "cancelled"),
  "rejected cards never emit cancelled rows",
);

// 7. Empty group: no entries, non-terminal.
const empty = resolveCumulativeRequestLifecycleTimeline([], { kind: "rejected" });
assert(empty.entries.length === 0 && empty.terminal === false, "empty group yields no entries and non-terminal");

// 8. Per-entry cycle attribution is preserved (both rows of a numbered pair
//    carry N; unnumbered rows carry null and render no label).
const numbered = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 40, status: "cancelled", decided_at: "2026-09-02T10:00:00Z", cycle_number: 2 }),
    request({ join_request_id: 41, status: "cancelled", submitted_at: "2026-09-10T10:00:00Z", created_at: "2026-09-10T10:00:00Z", decided_at: "2026-09-11T10:00:00Z" }),
  ],
  { kind: "cancelled" },
);
const numberedRows = numbered.entries.filter((e) => e.cycle_number === 2);
assert(numberedRows.length === 2, "both rows of a numbered pair carry its cycle number");
assert(
  numbered.entries.filter((e) => e.cycle_number == null).length === 2,
  "unpaired rows carry null cycle (no label renders)",
);

// 9. Timeline keys stay unique without backend ids (null-decided_at cancel
//    shares its submitted anchor's timestamp and must not collide).
assert(timelineEntryKey({ id: 7, source_type: "audit_event", timestamp: "2026-09-02T10:00:00Z" }) === "audit_event:7", "id-carrying entries key on source-qualified id, never bare id (U-033 collision)");
assert(
  timelineEntryKey({ id: 7, source_type: "audit_event", timestamp: "2026-09-02T10:00:00Z" }) !==
    timelineEntryKey({ id: 7, source_type: "join_request", timestamp: "2026-09-02T10:00:00Z" }),
  "same id from different sources produces distinct keys",
);
const anchorKey = timelineEntryKey({ source_type: "join_request", timestamp: "2026-09-10T10:00:00Z" });
const decisionKey = timelineEntryKey({ source_type: "audit_event", action: "cancelled", timestamp: "2026-09-10T10:00:00Z" });
assert(anchorKey !== decisionKey, "same-timestamp anchor/decision rows get distinct keys");

// 10. Submitted anchors carry reapplied_from_request_id for the shared label
// map (reapply rows render "Reapplied"); fresh anchors carry null.
const reappliedGroup = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 50, status: "cancelled", decided_at: "2026-09-02T10:00:00Z" }),
    request({
      join_request_id: 51,
      status: "cancelled",
      submitted_at: "2026-09-10T10:00:00Z",
      created_at: "2026-09-10T10:00:00Z",
      decided_at: "2026-09-11T10:00:00Z",
      reapplied_from_request_id: 50,
    }),
  ],
  { kind: "cancelled" },
);
const anchors = reappliedGroup.entries.filter((e) => e.action == null);
assert(
  anchors.find((e) => e.timestamp.startsWith("2026-09-10"))?.reapplied_from_request_id === 50,
  "reapply anchor carries its lineage marker",
);
assert(
  anchors.find((e) => e.timestamp.startsWith("2026-09-01"))?.reapplied_from_request_id == null,
  "fresh anchor carries no lineage marker",
);

// 11. Rejected cards never synthesize appeal rows: reconsideration appeals
// surface as real history rows via getRejectedAppealHistory (Revoked
// mechanism), never from emitter input. The emitter stays silent here.
const rejectedNoSynthesize = resolveCumulativeRequestLifecycleTimeline(
  [request({ join_request_id: 60, status: "rejected", decided_at: "2026-09-02T10:00:00Z" })],
  { kind: "rejected" },
);
assert(
  rejectedNoSynthesize.entries.every((e) => e.action !== "reconsideration_requested"),
  "emitter never synthesizes appeal rows",
);

// U-054 Expired conversion (U-022d shape): reactivation sub-events ride
// narrative_text verbatim; submitted/expired render canonical. Approved
// and downstream membership moments never emit here (U-054 §2 scope).
const narrativeRows = resolveExpiredNarrativeTimeline(
  {
    status: "approved",
    submitted_at: "2026-09-01T10:00:00Z",
    created_at: "2026-09-01T10:00:00Z",
    originally_expired_at: "2026-09-05T10:00:00Z",
    reactivation_requested_at: "2026-09-06T10:00:00Z",
    reactivation_requested_by: 7,
    reactivation_accepted_at: "2026-09-07T10:00:00Z",
    decided_at: "2026-09-08T10:00:00Z",
    agency_id: 42,
    agency_name: "Staging Test Agency",
    user_id: 7,
    seeker_name: "Zed",
  },
  { viewerUserId: 7, viewerIsApplicant: true },
);
assert(
  narrativeRows.map((e) => e.action ?? "submitted").join(",") ===
    "submitted,expired,reactivation_requested,reactivation_accepted" &&
    narrativeRows.filter((e) => e.narrative_text != null).length === 2 &&
    narrativeRows.find((e) => e.action === "reactivation_requested")?.narrative_text ===
      "You requested to reactivate application" &&
    narrativeRows.every((e) => e.agency_id === 42 && e.user_id === 7),
  "expired rows scope to the expired lifecycle with U-022d narrative wins",
);

// Expired pair header badge (U-021): names the pair's live application
// standing only — membership standing rides the qualifier, never the
// badge (foreign lifecycles must not surface here).
const badgeCases = [
  resolveExpiredPairBadgeStatus("expired") === "expired",
  resolveExpiredPairBadgeStatus("pending") === "pending",
  resolveExpiredPairBadgeStatus("approved") === "approved",
  resolveExpiredPairBadgeStatus(null) === "expired",
];
assert(
  badgeCases.every(Boolean),
  `expired pair badge resolves from the live record (${badgeCases.map(String).join(",")})`,
);

// U-055 multipath exclusion: superseded rows keep their audit rows but
// never count as rejections, carry no machine reason, and annotate
// their resolution for the tier notice.
const SUPERSEDED_REASON = "Auto-closed: membership resolved through another path.";
const mixedRejected = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 70, status: "rejected", rejection_reason: "No fit", decided_at: "2026-09-02T10:00:00Z" }),
    request({
      join_request_id: 71,
      status: "rejected",
      rejection_reason: SUPERSEDED_REASON,
      submitted_at: "2026-09-10T10:00:00Z",
      created_at: "2026-09-10T10:00:00Z",
      decided_at: "2026-09-11T10:00:00Z",
      reactivation_requested_at: "2026-09-10T12:00:00Z",
    }),
  ],
  { kind: "rejected" },
);
assert(mixedRejected.terminal === false, "superseded second rejection stays non-terminal");
assert(
  mixedRejected.hasReturningAppealRejection === false,
  "superseded rows never trip the returning-appeal flag",
);
const supersededRow = mixedRejected.entries.find((e) => e.action === "rejected" && e.timestamp === "2026-09-11T10:00:00Z");
assert(supersededRow?.reason == null, "superseded decision row suppresses the machine reason");
assert(
  (supersededRow as { multipathResolution?: string }).multipathResolution === "accepted",
  "superseded decision row annotates its resolution",
);
assert(
  mixedRejected.entries.filter((e) => e.source_type === "join_request").length === 2,
  "superseded cycles keep their submitted anchors",
);
const cancelledImmune = resolveCumulativeRequestLifecycleTimeline(
  [
    request({ join_request_id: 72, status: "cancelled", decided_at: "2026-09-02T10:00:00Z" }),
    request({
      join_request_id: 73,
      status: "rejected",
      rejection_reason: SUPERSEDED_REASON,
      submitted_at: "2026-09-10T10:00:00Z",
      created_at: "2026-09-10T10:00:00Z",
      decided_at: "2026-09-11T10:00:00Z",
    }),
  ],
  { kind: "cancelled" },
);
assert(
  cancelledImmune.entries.every((e) => (e as { multipathResolution?: string }).multipathResolution == null),
  "superseded rejected rows never enter cancelled lineage",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll cumulative emitter assertions passed.");

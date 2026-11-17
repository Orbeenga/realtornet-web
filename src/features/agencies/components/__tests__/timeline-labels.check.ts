/**
 * Timeline label regression check (F2, U-017 extension): join_request rows
 * carrying reapplied_from_request_id render "Reapplied" instead of
 * "Submitted"; all other shapes keep their canonical labels.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/timeline-labels.check.ts
 */
import { resolveTimelineLabel } from "../MembershipHistoryList";
import type { MembershipTimelineEntry } from "@/types";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function entry(partial: Record<string, unknown>): MembershipTimelineEntry {
  return {
    timestamp: "2026-09-12T10:00:00Z",
    ...partial,
  } as unknown as MembershipTimelineEntry;
}

assert(
  resolveTimelineLabel(entry({ source_type: "join_request" })) === "Submitted",
  "first submission stays Submitted",
);
assert(
  resolveTimelineLabel(entry({ source_type: "join_request", reapplied_from_request_id: null })) ===
    "Submitted",
  "explicit null reapplied marker stays Submitted",
);
assert(
  resolveTimelineLabel(entry({ source_type: "join_request", reapplied_from_request_id: 12 })) ===
    "Reapplied",
  "reapply submission renders Reapplied",
);
assert(
  resolveTimelineLabel(entry({ source_type: "join_request", action: "cancelled" })) === "Cancelled",
  "decision actions keep their mapped labels",
);
assert(
  resolveTimelineLabel(entry({ source_type: "review_request" })) === "Review requested",
  "review_request shape unchanged",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event" })) === "Event",
  "unknown shape still falls back to Event",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("timeline-labels check passed");

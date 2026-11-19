/**
 * Gate-registry enforcement + conformance (U-052).
 *
 * 1. Enforcement: every mutation hook under the src feature hooks dirs
 *    must have a registry entry or a documented allowlist reason — the suite fails
 *    otherwise. Both directions are stale-checked (unknown hook fails,
 *    orphaned allowlist/registry name fails), so the classification cannot
 *    rot. Factories are resolved: a hook delegating to a same-file
 *    useMutation factory counts as a mutation hook; cross-file wrappers must
 *    carry their own useMutation (asserted limitation, see below).
 * 2. Conformance: registry shape, migrated ratchet, Gate-2 validation,
 *    envelope-tolerant pending_exists extraction, stale-view toast mapping.
 *
 * Run: pnpm exec tsx src/lib/__tests__/gate-registry.check.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@/lib/api/client";
import {
  doubleGateOrderedToast,
  validateDoubleGateMessage,
} from "@/lib/membership-lifecycle-messages";
import {
  extractPendingExists,
  GATE_REGISTRY,
  REGISTRY_HOOK_NAMES,
  resolveStaleViewToast,
  validateGateFieldValues,
  type GateActionKind,
  type GateFieldValues,
} from "@/lib/gate-registry";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Extractor                                                           */
/* ------------------------------------------------------------------ */

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'A-Za-z0-9_])\/\/.*$/gm, "$1");
}

interface DeclBlock {
  name: string;
  exported: boolean;
  isHook: boolean;
  body: string;
}

function parseDecls(source: string): DeclBlock[] {
  const clean = stripComments(source);
  const starts: { index: number; exported: boolean; name: string }[] = [];
  const re = /^(export\s+)?(function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    starts.push({
      index: m.index,
      exported: m[1] != null,
      name: m[3] ?? m[4] ?? "",
    });
  }
  return starts.map((s, i) => ({
    name: s.name,
    exported: s.exported,
    isHook: /^use[A-Z]/.test(s.name),
    body: clean.slice(s.index, i + 1 < starts.length ? starts[i + 1].index : undefined),
  }));
}

/** Exported hooks that mutate: direct useMutation or same-file delegation to
    a useMutation factory. */
export function findMutationHooks(source: string): string[] {
  const decls = parseDecls(source);
  const direct = new Set(
    decls.filter((d) => d.body.includes("useMutation(")).map((d) => d.name),
  );
  const found: string[] = [];
  for (const decl of decls) {
    if (!decl.exported || !decl.isHook) continue;
    if (direct.has(decl.name)) {
      found.push(decl.name);
      continue;
    }
    for (const factory of direct) {
      if (!/^use[A-Z]/.test(factory)) continue;
      if (new RegExp(`\\b${factory}\\b`).test(decl.body)) {
        found.push(decl.name);
        break;
      }
    }
  }
  return found;
}

function walkHookFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkHookFiles(full, out);
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/(__tests__|\.check\.|\.test\.|\.spec\.)/.test(full) &&
      entry !== "index.ts"
    ) {
      out.push(full);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Extractor self-tests (prove the failure mode on fixtures)           */
/* ------------------------------------------------------------------ */

const FIXTURE = `
import { useMutation } from "@tanstack/react-query";
function useLocalFactory() {
  return useMutation({ mutationFn: async () => null });
}
export function useDirect() {
  return useMutation({ mutationFn: async () => null });
}
export function useDelegated() {
  return useLocalFactory();
}
export function useQueryOnly() {
  return useQuery({ queryKey: ["x"] });
}
// useMutation( mentioned here must not trip the extractor
export function useCommentTrap() {
  return useQuery({ queryKey: ["y"] });
}
`;

const fixtureFound = findMutationHooks(FIXTURE);
assert(fixtureFound.includes("useDirect"), "extractor finds direct useMutation");
assert(
  fixtureFound.includes("useDelegated"),
  "extractor finds same-file factory delegates",
);
assert(!fixtureFound.includes("useQueryOnly"), "extractor skips query hooks");
assert(
  !fixtureFound.includes("useCommentTrap"),
  "extractor ignores useMutation in comments",
);
assert(
  !fixtureFound.includes("useLocalFactory"),
  "extractor reports exported hooks only",
);

/* ------------------------------------------------------------------ */
/* Allowlist: mutation hooks with no registry entry, each with a reason */
/* ------------------------------------------------------------------ */

/* Ungated allowlist. Every entry needs a reason; entries are stale-checked
   (an allowlisted name that no longer mutates fails). Shrink this list at
   each migration step — never grow it without a lead ruling. */
const UNGATED_ALLOWLIST: Record<string, string> = {
  // Admin console (profile unassigned in U-052, which profiles membership actions).
  useUpdateAdminUserRole: "admin role assignment; classify when registry widens beyond membership",
  useAssignAgentAgency: "admin agency assignment; classify when registry widens beyond membership",
  useDeactivateAdminUser: "Tier-1 lifecycle per original DEF; U-052 profiles membership actions only — classify at type-the-name step",
  useActivateAdminUser: "restorative admin action; Profile A candidate",
  // Agency-application moderation surface (profile unassigned in U-052).
  useApplyForAgency: "agency-application create; profile unassigned in U-052",
  useApproveAgencyApplication: "agency-application decision; profile unassigned in U-052",
  useRejectAgencyApplication: "agency-application decision; profile unassigned in U-052",
  useRevokeAgencyApproval: "agency-application decision; profile unassigned in U-052",
  useSuspendAgency: "agency-application decision; profile unassigned in U-052",
  // Invitations.
  useInviteAgencyAgent: "invite create form, not a gated dialog",
  useAcceptAgencyInvite: "legacy accept path; confirm live vs dead at invitation migration",
  useAcceptAgencyInvitation: "restorative accept; Profile A candidate",
  useRejectAgencyInvitation: "U-052 open: carries no reason — B needs a contract change; confirm-only candidate",
  useReactivateInvitation: "decision-side of invitation reactivation; profile unassigned in U-052",
  // Membership consent + restorative (profiles unassigned in U-052).
  useRejectJoinRequestReactivation: "seeker consent reject carries no reason ({requestId} only); profile unassigned in U-052",
  useRestoreAgencyMembership: "restorative; Profile A candidate",
  useUnblockAgencyMembership: "restorative; Profile A candidate",
  useCreateAgencyMembershipReviewRequest: "request-creating but unlisted in U-052 Gate-1 scope; 409 string-sniff retained",
  // Dedicated forms owning their own validation (not gate dialogs).
  useUpdateAgencyProfile: "settings form CRUD, ungated",
  useTransferOwnership: "dedicated multi-field form (new owner + reason + demote flag); owns its validation",
  // Favorites / inquiries / notifications / profile: product CRUD, ungated.
  useAddFavorite: "product CRUD, ungated",
  useRemoveFavorite: "product CRUD, ungated",
  useFavoriteToggle: "delegates to favorite primitives, ungated",
  useEditReply: "inquiry CRUD, ungated",
  useUpdateInquiryStatus: "inquiry workflow flag, ungated",
  useMarkInquiryViewed: "inquiry workflow flag, ungated",
  useReplyToInquiry: "inquiry composer form, ungated",
  useSubmitInquiry: "inquiry create form, ungated",
  useMarkNotificationRead: "notification flag, ungated",
  useMarkAllNotificationsRead: "notification flag, ungated",
  useUpsertMyProfile: "settings form CRUD, ungated",
  useUploadMyAvatar: "settings CRUD, ungated",
  useDeleteMyAvatar: "settings-scoped delete with own confirm; classify if registry widens to settings",
  // Properties domain (U-052 profiles membership actions only).
  useAgencyApproveProperty: "property moderation decision; classify when registry widens to properties",
  useAgencyRejectProperty: "property moderation decision; classify when registry widens to properties",
  useSyncPropertyAmenities: "property form sync, ungated",
  useCreateProperty: "listing create form, ungated",
  useDeleteProperty: "destructive property delete with own confirm; classify when registry widens to properties",
  useInstructAgent: "agent instruction composer; classify when registry widens to properties",
  useUploadPropertyImage: "image manager CRUD, ungated",
  useDeletePropertyImage: "image manager CRUD, ungated",
  useSetPrimaryImage: "image manager CRUD, ungated",
  useReorderPropertyImages: "image manager CRUD, ungated",
  useUpdateImageMetadata: "image manager CRUD, ungated",
  useRejectPermanent: "property moderation decision; classify when registry widens to properties",
  useCreateSavedSearch: "saved-search CRUD, ungated",
  useUpdateSavedSearch: "saved-search CRUD, ungated",
  useDeleteSavedSearch: "saved-search CRUD, ungated",
  useExecuteSavedSearch: "saved-search run, ungated",
  useUpdateProperty: "listing edit form, ungated",
  useVerifyProperty: "property moderation decision; classify when registry widens to properties",
  useSubmitPropertyForReview: "property moderation lifecycle; classify when registry widens to properties",
  useSubmitPropertyToAdmin: "property moderation lifecycle; classify when registry widens to properties",
  useWithdrawPropertyFromReview: "property moderation lifecycle; classify when registry widens to properties",
  useResubmitProperty: "property moderation lifecycle; classify when registry widens to properties",
  useRecallPropertyFromAdminReview: "property moderation lifecycle; classify when registry widens to properties",
  useAdminApproveProperty: "property moderation lifecycle; classify when registry widens to properties",
  useAdminRejectProperty: "property moderation lifecycle; classify when registry widens to properties",
  useReinstateProperty: "property moderation lifecycle; classify when registry widens to properties",
  useRevokeProperty: "property moderation lifecycle; classify when registry widens to properties",
  useRestoreProperty: "property moderation lifecycle; classify when registry widens to properties",
  // Reviews domain.
  useCreatePropertyReview: "review form CRUD, ungated",
  useUpdatePropertyReview: "review form CRUD, ungated",
  useDeletePropertyReview: "U-052 open: delete-review referent unconfirmed — register when lead confirms",
  useCreateAgentReview: "review form CRUD, ungated",
  useUpdateAgentReview: "review form CRUD, ungated",
  useDeleteAgentReview: "U-052 open: delete-review referent unconfirmed — register when lead confirms",
  useCreateAgencyReview: "review form CRUD, ungated",
};

/* ------------------------------------------------------------------ */
/* Enforcement run                                                     */
/* ------------------------------------------------------------------ */

const HOOKS_ROOT = join(process.cwd(), "src", "features");
const hookFiles = walkHookFiles(HOOKS_ROOT).filter((f) => {
  const segments = f.split(/[/\\]/);
  return segments.includes("hooks") || segments[segments.length - 1] === "hooks.ts";
});
assert(hookFiles.length > 20, `hook scan covers feature hooks (found ${hookFiles.length} files)`);

const foundHooks = new Map<string, string>();
for (const file of hookFiles) {
  for (const name of findMutationHooks(readFileSync(file, "utf8"))) {
    if (!foundHooks.has(name)) foundHooks.set(name, file);
  }
}

// Canaries: known direct, factory-delegated, and query hooks.
for (const name of [
  "useReapplyAgencyJoinRequest",
  "useSuspendAgencyMembership",
  "useTransferOwnership",
  "useSubmitPropertyForReview",
  "useDeletePropertyReview",
]) {
  assert(foundHooks.has(name), `extractor finds ${name}`);
}
for (const name of ["useAgencyReviewRequests", "useMyAgencyJoinRequests", "useAgencies"]) {
  assert(!foundHooks.has(name), `extractor skips query hook ${name}`);
}

// Every mutation hook is registered or allowlisted.
const unclassified: string[] = [];
for (const [name, file] of foundHooks) {
  if (!REGISTRY_HOOK_NAMES.has(name) && !(name in UNGATED_ALLOWLIST)) {
    unclassified.push(`${name} (${file})`);
  }
}
assert(
  unclassified.length === 0,
  unclassified.length === 0
    ? `all ${foundHooks.size} mutation hooks classified (registry or allowlist)`
    : `unclassified mutation hooks: ${unclassified.join("; ")}`,
);

// No rot in either direction.
for (const name of Object.keys(UNGATED_ALLOWLIST)) {
  assert(foundHooks.has(name), `allowlist entry still mutates: ${name}`);
}
for (const name of REGISTRY_HOOK_NAMES) {
  assert(foundHooks.has(name), `registry hook still exists: ${name}`);
}

/* ------------------------------------------------------------------ */
/* Registry conformance                                                */
/* ------------------------------------------------------------------ */

const specs = Object.values(GATE_REGISTRY);
assert(specs.length === 17, `registry holds 17 actions (found ${specs.length})`);

const seenHooks = new Set<string>();
for (const spec of specs) {
  assert(["A", "B", "C", "D"].includes(spec.profile), `${spec.action}: valid profile`);
  assert(spec.hooks.length > 0, `${spec.action}: declares hooks`);
  assert(
    /^(GET|POST|PATCH|PUT|DELETE) \//.test(spec.endpoint),
    `${spec.action}: declares endpoint (${spec.endpoint})`,
  );
  for (const hook of spec.hooks) {
    assert(!seenHooks.has(hook), `hook ${hook} in exactly one action`);
    seenHooks.add(hook);
  }
  for (const field of spec.fields) {
    assert(
      ["message", "reason", "typename"].includes(field.kind),
      `${spec.action}: valid field kind ${field.kind}`,
    );
  }
  if (spec.profile === "A") {
    assert(spec.fields.length === 0, `${spec.action}: Profile A renders no fields`);
  }
  if (spec.profile === "D") {
    assert(
      spec.fields.some((f) => f.kind === "reason") &&
        spec.fields.some((f) => f.kind === "typename"),
      `${spec.action}: Profile D renders reason + type-the-name`,
    );
  }
}

// Message blank copy stays canonical (single source in messages lib).
assert(
  validateDoubleGateMessage(" ") === "Enter a message before continuing.",
  "message blank copy canonical",
);
for (const spec of specs) {
  for (const field of spec.fields) {
    if (field.kind !== "message") continue;
    assert(
      field.blankError === validateDoubleGateMessage(" "),
      `${spec.action}: message blankError matches canonical copy`,
    );
  }
}

// Migrated ratchet: step 1 lands reapply + cancel; F3/F4 nudges rewired.
const migrated = specs.filter((s) => s.migrated).map((s) => s.action);
for (const action of [
  "cancel_join",
  "reapply",
  "reconsideration_request",
  "reactivation_request",
] as GateActionKind[]) {
  assert(migrated.includes(action), `migrated: ${action}`);
}
assert(
  migrated.length === 4,
  `exactly 4 migrated actions (found ${migrated.length}) — flip flags only at their migration step`,
);
for (const spec of specs) {
  if (spec.profile === "C" && spec.dialog && spec.migrated) {
    assert(spec.gate1.length > 0, `${spec.action}: migrated Profile C runs Gate 1`);
  }
}
assert(GATE_REGISTRY.apply.dialog === false, "apply: form owns UI, no dialog");

/* ------------------------------------------------------------------ */
/* Gate-2 validation                                                   */
/* ------------------------------------------------------------------ */

const EMPTY: GateFieldValues = { message: "", reason: "", typename: "" };

assert(
  validateGateFieldValues(GATE_REGISTRY.reapply, EMPTY).message ===
    "Enter a message before continuing.",
  "Gate 2: blank message blocks with canonical copy",
);
assert(
  validateGateFieldValues(GATE_REGISTRY.cancel_join, EMPTY).reason ===
    "Enter a reason before continuing.",
  "Gate 2: blank reason blocks with reason copy",
);
assert(
  Object.keys(
    validateGateFieldValues(GATE_REGISTRY.reapply, { ...EMPTY, message: " hi " }),
  ).length === 0,
  "Gate 2: non-blank message passes",
);
assert(
  validateGateFieldValues(GATE_REGISTRY.block_membership, EMPTY, "Ada").typename ===
    'Type "Ada" to continue.',
  "Gate 2: blank typename blocks with target copy",
);
assert(
  validateGateFieldValues(
    GATE_REGISTRY.block_membership,
    { ...EMPTY, reason: "x", typename: "ada" },
    "Ada",
  ).typename === 'Type "Ada" exactly to confirm.',
  "Gate 2: typename mismatch blocks (case-sensitive)",
);
assert(
  Object.keys(
    validateGateFieldValues(
      GATE_REGISTRY.block_membership,
      { ...EMPTY, reason: "x", typename: "Ada" },
      "Ada",
    ),
  ).length === 0,
  "Gate 2: exact typename passes",
);

/* ------------------------------------------------------------------ */
/* pending_exists extraction + stale-view mapping                      */
/* ------------------------------------------------------------------ */

const signal = { code: "pending_exists", kind: "join_request", message: "stale" };
assert(
  extractPendingExists(new ApiError(409, signal))?.kind === "join_request",
  "extract: bare dict signal",
);
assert(
  extractPendingExists(new ApiError(409, { Detail: signal }))?.kind === "join_request",
  "extract: capital-Detail envelope (production)",
);
assert(
  extractPendingExists(new ApiError(409, { detail: signal }))?.kind === "join_request",
  "extract: lowercase-detail envelope (test transport)",
);
assert(
  extractPendingExists(new ApiError(409, "plain string")) === null,
  "extract: string detail is not a signal",
);
assert(
  extractPendingExists(new ApiError(422, [{ loc: ["x"], msg: "bad" }])) === null,
  "extract: 422 array is not a signal",
);
assert(
  extractPendingExists(
    new ApiError(409, { code: "pending_exists", kind: "nope", message: "x" }),
  ) === null,
  "extract: unknown kind is not a signal",
);
assert(extractPendingExists(new Error("boom")) === null, "extract: non-ApiError is not a signal");

for (const spec of specs.filter((s) => s.profile === "C" && s.migrated)) {
  for (const kind of ["join_request", "review_request", "reactivation"] as const) {
    const toast = resolveStaleViewToast(spec, kind, "Acme");
    const expected = doubleGateOrderedToast(
      kind === "join_request" ? (spec.nudgeNoun ?? "reapplication") : kind === "review_request" ? "reconsideration" : "reactivation",
      "Acme",
    );
    assert(toast === expected, `stale-view: ${spec.action} + ${kind} maps to Gate-1 toast`);
  }
}
assert(
  resolveStaleViewToast(GATE_REGISTRY.apply, "join_request", "Acme") === null,
  "stale-view: unmigrated apply falls back to server-verbatim",
);
assert(
  resolveStaleViewToast(GATE_REGISTRY.cancel_join, "join_request", "Acme") === null,
  "stale-view: non-C actions fall back to server-verbatim",
);

if (failures > 0) {
  console.error(`\n${failures} gate-registry check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll gate-registry checks passed.");
}


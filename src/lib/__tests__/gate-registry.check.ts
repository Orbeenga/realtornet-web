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
  declineRequestKind,
  extractPendingExists,
  GATE_REGISTRY,
  KNOWN_COPY_TOKENS,
  REGISTRY_HOOK_NAMES,
  resolveCopyTemplate,
  resolveStaleViewToast,
  runGate1Checks,
  templateTokens,
  validateStepFields,
  type ActionGateSpec,
  type Gate1Context,
  type GateActionKind,
  type GateFieldValues,
  type GateStepId,
} from "@/lib/gate-registry";

function stepBody(spec: ActionGateSpec, id?: GateStepId): string | undefined {
  const step = id == null ? spec.steps[0] : spec.steps.find((s) => s.id === id);
  return step?.bodyTemplate;
}

function stepTitle(spec: ActionGateSpec, id?: GateStepId): string | undefined {
  const step = id == null ? spec.steps[0] : spec.steps.find((s) => s.id === id);
  return step?.titleTemplate;
}

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
  useAcceptAgencyInvite: "legacy token-page accept path; the inbox accept migrated as invitation_accept",
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
assert(specs.length === 18, `registry holds 18 actions (found ${specs.length})`);

const stepIds = (spec: (typeof specs)[number]) => spec.steps.map((s) => s.id).join(",");
const SEVERE = new Set(["block_membership", "revoke_membership", "suspend_membership"]);

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
  // Steps shape per U-053 (dialog:false ⟺ no steps).
  if (!spec.dialog) {
    assert(spec.steps.length === 0, `${spec.action}: no dialog means no steps`);
  } else {
    assert(spec.steps.length > 0, `${spec.action}: dialog means steps`);
  }
  const ids = stepIds(spec);
  if (spec.profile === "A") {
    assert(ids === "confirm", `${spec.action}: Profile A is a single confirm`);
  } else if (spec.profile === "B") {
    assert(
      ids === (SEVERE.has(spec.action) ? "intent,fields,review" : "fields,review"),
      `${spec.action}: B ${SEVERE.has(spec.action) ? "severe" : "plain"} step shape (${ids})`,
    );
  } else if (spec.profile === "C" && spec.dialog) {
    assert(
      ids === "fields,review" || ids === "confirm",
      `${spec.action}: Profile C is message+confirm or confirm-only (${ids})`,
    );
  } else if (spec.profile === "D") {
    assert(ids === "intent,fields,review", `${spec.action}: Profile D is intent+reason+typename (${ids})`);
  }
  // Per-step rules.
  for (const [i, step] of spec.steps.entries()) {
    const last = i === spec.steps.length - 1;
    assert(step.primaryLabel.length > 0, `${spec.action}: step ${i} names its primary`);
    if (!last) {
      assert(step.primaryLabel === "Proceed", `${spec.action}: non-final primary is Proceed`);
    } else {
      assert(
        step.primaryLabel === spec.confirmLabel,
        `${spec.action}: final primary matches confirm label`,
      );
    }
    if (step.id === "intent") {
      assert(step.fields.length === 0, `${spec.action}: intent step has no fields`);
      assert(!step.echo?.length, `${spec.action}: intent step has no echo`);
    }
    if (step.id === "review") {
      assert((step.echo?.length ?? 0) > 0, `${spec.action}: review step echoes drafted input`);
    }
    if (step.id === "confirm") {
      for (const field of step.fields) {
        assert(
          field.kind === "note" && !field.required,
          `${spec.action}: confirm-step fields are optional notes only`,
        );
      }
    }
    for (const field of step.fields) {
      assert(
        ["message", "reason", "typename", "note"].includes(field.kind),
        `${spec.action}: valid field kind ${field.kind}`,
      );
      if (field.kind === "typename") {
        assert(
          spec.action === "block_membership",
          `${spec.action}: type-the-name belongs to block only`,
        );
      }
      if (field.kind === "note") {
        assert(spec.profile === "A", `${spec.action}: notes belong to Profile A only`);
      }
    }
    // Template token hygiene.
    for (const template of [step.titleTemplate, step.bodyTemplate]) {
      if (template == null) continue;
      assert(template.length > 0, `${spec.action}: template is non-empty`);
      for (const token of templateTokens(template)) {
        assert(
          KNOWN_COPY_TOKENS.includes(token),
          `${spec.action}: template token {${token}} is known`,
        );
      }
      const rendered = resolveCopyTemplate(template, { name: "N", agency: "A", target: "T", kind: "K" });
      assert(!rendered.includes("{"), `${spec.action}: sample render leaves no braces`);
    }
  }
  if (spec.profile === "D") {
    const allKinds = spec.steps.flatMap((s) => s.fields.map((f) => f.kind));
    assert(
      allKinds.includes("reason") && allKinds.includes("typename"),
      `${spec.action}: Profile D renders reason + type-the-name`,
    );
  }
}

// Verbatim locked copy (U-053): any drift fails.
assert(
  stepBody(GATE_REGISTRY.accept_review) === "Confirm membership for {name}.",
  "copy: accept review body verbatim",
);
assert(
  stepBody(GATE_REGISTRY.block_membership, "intent") ===
    "You are about to block {name}. This action cannot be undone.",
  "copy: block intent body verbatim",
);
assert(
  stepTitle(GATE_REGISTRY.revoke_membership, "intent") === "Revoke {name}'s membership?",
  "copy: revoke intent title verbatim",
);
assert(
  stepBody(GATE_REGISTRY.revoke_membership, "review") ===
    "{name}'s membership will be revoked from {agency}.",
  "copy: revoke final body verbatim",
);
assert(
  stepTitle(GATE_REGISTRY.suspend_membership, "intent") === "Suspend {name}?",
  "copy: suspend intent title verbatim",
);
assert(
  stepBody(GATE_REGISTRY.suspend_membership, "review") ===
    "{name} will be suspended from {agency}.",
  "copy: suspend final body verbatim",
);
assert(
  GATE_REGISTRY.revoke_membership.confirmLabel === "Revoke membership",
  "copy: revoke renamed (Remove from agency is gone)",
);

// Operator-approved step copy (surgical tune-up): severe reason steps name
// the action; block final states the technical outcome; decline is
// event-aware via the kind token.
assert(
  stepBody(GATE_REGISTRY.block_membership, "fields") ===
    "Confirm you want to block {name}. A reason is required and will be visible in membership history.",
  "copy: block reason body verbatim",
);
assert(
  stepBody(GATE_REGISTRY.block_membership, "review") ===
    "Confirm you want to block {name}. Membership with {agency} will be blocked with no path to appeal.",
  "copy: block final body verbatim",
);
assert(
  stepBody(GATE_REGISTRY.revoke_membership, "fields") ===
    "Confirm you want to revoke {name}'s membership. A reason is required and will be visible in membership history.",
  "copy: revoke reason body verbatim",
);
assert(
  stepBody(GATE_REGISTRY.suspend_membership, "fields") ===
    "Confirm suspension for {name}. A reason is required and will be visible in membership history.",
  "copy: suspend reason body verbatim",
);
assert(
  stepTitle(GATE_REGISTRY.decline_review, "fields") === "Decline {kind}" &&
    stepBody(GATE_REGISTRY.decline_review, "fields") ===
      "Confirm decline for {name}'s {kind}. A reason is required for decline and will be visible in membership history." &&
    stepTitle(GATE_REGISTRY.decline_review, "review") === "Decline {kind}" &&
    stepBody(GATE_REGISTRY.decline_review, "review") === "Confirm decline for {name}'s {kind}.",
  "copy: decline event-aware title+bodies verbatim",
);
assert(
  declineRequestKind({ source_type: "review_request", join_request_id: 9 }) ===
    "reconsideration request",
  "kind: linked review row is a reconsideration request",
);
assert(
  declineRequestKind({ source_type: "review_request", join_request_id: null }) ===
    "review request",
  "kind: unlinked review row falls back to review request",
);
assert(
  declineRequestKind({ source_type: "join_request", reapplied_from_request_id: 4 }) ===
    "reapplication",
  "kind: reapplied row is a reapplication",
);
assert(
  declineRequestKind({ source_type: "join_request", reactivation_requested_by: 2 }) ===
    "reactivation",
  "kind: reactivation row is a reactivation",
);
assert(
  declineRequestKind({ source_type: "membership_review_request" }) === "review request",
  "kind: membership rows fall back to review request",
);

// Message blank copy stays canonical (single source in messages lib).
assert(
  validateDoubleGateMessage(" ") === "Enter a message before continuing.",
  "message blank copy canonical",
);
for (const spec of specs) {
  for (const step of spec.steps) {
    for (const field of step.fields) {
      if (field.kind !== "message") continue;
      assert(
        field.blankError === validateDoubleGateMessage(" "),
        `${spec.action}: message blankError matches canonical copy`,
      );
    }
  }
}

// Migrated ratchet: steps 1-4 land 15 actions; U-053 adds invitation_accept
// (Profile A + note, the only consumer of the new invitation note body).
const migrated = specs.filter((s) => s.migrated).map((s) => s.action);
for (const action of [
  "cancel_join",
  "reapply",
  "reconsideration_request",
  "reactivation_request",
  "accept_review",
  "decline_review",
  "approve_join",
  "reject_join",
  "accept_reactivation",
  "suspend_membership",
  "revoke_membership",
  "block_membership",
  "leave_membership",
  "withdraw_invitation",
  "invitation_reactivation_request",
  "invitation_accept",
] as GateActionKind[]) {
  assert(migrated.includes(action), `migrated: ${action}`);
}
assert(
  migrated.length === 16,
  `exactly 16 migrated actions (found ${migrated.length}) — flip flags only at their migration step`,
);
assert(
  GATE_REGISTRY.apply.migrated === false,
  "apply stays unmigrated until its Gate-1 predicate is ruled",
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

const EMPTY: GateFieldValues = { message: "", reason: "", typename: "", note: "" };

function fieldsOf(action: GateActionKind, id: GateStepId) {
  return GATE_REGISTRY[action].steps.find((s) => s.id === id)?.fields ?? [];
}

assert(
  validateStepFields(fieldsOf("reapply", "fields"), EMPTY).message ===
    "Enter a message before continuing.",
  "Gate 2: blank message blocks with canonical copy",
);
assert(
  validateStepFields(fieldsOf("cancel_join", "fields"), EMPTY).reason ===
    "Enter a reason before continuing.",
  "Gate 2: blank reason blocks with reason copy",
);
assert(
  Object.keys(
    validateStepFields(fieldsOf("reapply", "fields"), { ...EMPTY, message: " hi " }),
  ).length === 0,
  "Gate 2: non-blank message passes",
);
assert(
  validateStepFields(fieldsOf("block_membership", "review"), EMPTY, "Ada").typename ===
    'Type "Ada" to continue.',
  "Gate 2: blank typename blocks with target copy",
);
assert(
  validateStepFields(
    fieldsOf("block_membership", "review"),
    { ...EMPTY, reason: "x", typename: "ada" },
    "Ada",
  ).typename === 'Type "Ada" exactly to confirm.',
  "Gate 2: typename mismatch blocks (case-sensitive)",
);
assert(
  Object.keys(
    validateStepFields(
      fieldsOf("block_membership", "review"),
      { ...EMPTY, reason: "x", typename: "Ada" },
      "Ada",
    ),
  ).length === 0,
  "Gate 2: exact typename passes",
);
assert(
  Object.keys(
    validateStepFields(fieldsOf("accept_review", "confirm"), EMPTY),
  ).length === 0,
  "Gate 2: blank optional note passes (no gate)",
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

/* Invitation Gate-1 same-kind check (target-only; the UI hides the button
   once requested, so this path is spec-covered, not browser-covered). */
{
  const spec = GATE_REGISTRY.invitation_reactivation_request;
  const base: {
    joinRequests: Gate1Context["joinRequests"];
    reviewRequests: Gate1Context["reviewRequests"];
    viewerUserId: number;
    viewerIsApplicant: boolean;
    counterpartyName: string;
    includeCooldownCheck: boolean;
  } = {
    joinRequests: [],
    reviewRequests: [],
    viewerUserId: 1,
    viewerIsApplicant: true,
    counterpartyName: "Acme",
    includeCooldownCheck: false,
  };
  assert(
    runGate1Checks(spec, {
      ...base,
      invitations: [{ status: "expired", reactivation_requested_at: "2026-11-19T00:00:00Z" }],
    }) === "A reactivation is already pending with Acme",
    "Gate 1: requested invitation blocks with reactivation toast",
  );
  assert(
    runGate1Checks(spec, {
      ...base,
      invitations: [{ status: "expired", reactivation_requested_at: null }],
    }) === null,
    "Gate 1: fresh invitation is clear",
  );
  assert(
    runGate1Checks(spec, { ...base, invitations: [] }) === null,
    "Gate 1: missing target is clear (server authoritative)",
  );
}
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


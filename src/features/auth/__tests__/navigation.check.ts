/**
 * Register-loop resume checks: where signup lands. Invite-token signups
 * resume into the accept page (the token is preserved, never dropped);
 * plain signups keep the role-home routing.
 *
 * Run: pnpm exec tsx src/features/auth/__tests__/navigation.check.ts
 */
import { getPostLoginPath, getPostSignupPath } from "@/features/auth/navigation";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

// Fake fixture tokens below (not secrets): gitleaks:allow suppresses the
// hardcoded-credential rule per line, reviewed here, not bypassed.
assert(
  getPostSignupPath({ inviteToken: "abc.def.ghi", role: "seeker" }) === // gitleaks:allow
    "/agencies/accept-invite?token=abc.def.ghi",
  "token signup resumes into the accept page",
);
assert(
  getPostSignupPath({ inviteToken: "a/b+c=d", role: "seeker" }) === // gitleaks:allow
    "/agencies/accept-invite?token=a%2Fb%2Bc%3Dd",
  "token is URL-encoded in the resume path",
);
assert(
  getPostSignupPath({ inviteToken: null, role: "seeker" }) === getPostLoginPath("seeker"),
  "plain signup keeps role-home routing",
);
assert(
  getPostSignupPath({ inviteToken: "", role: "agent" }) === getPostLoginPath("agent"),
  "empty token keeps role-home routing",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll navigation checks passed.");

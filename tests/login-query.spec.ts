import { expect, test } from "@playwright/test";
import { stripCredentialParams } from "../src/features/auth/safeRedirect";

test("strip: removes password and email while preserving next", () => {
  const params = new URLSearchParams(
    "password=probe-not-a-secret&email=probe-not-a-secret@example.com&next=/properties",
  );
  const result = stripCredentialParams(params);
  expect(result.stripped).toBe(true);
  const target = new URL(result.target, "http://localhost");
  expect(target.pathname).toBe("/login");
  expect(target.searchParams.has("password")).toBe(false);
  expect(target.searchParams.has("email")).toBe(false);
  expect(target.searchParams.get("next")).toBe("/properties");
});

test("strip: password alone collapses to bare /login", () => {
  const result = stripCredentialParams(
    new URLSearchParams("password=probe-not-a-secret"),
  );
  expect(result).toEqual({ stripped: true, target: "/login" });
});

test("strip: preserves registered alongside next", () => {
  const result = stripCredentialParams(
    new URLSearchParams("password=probe-not-a-secret&next=/x&registered=true"),
  );
  expect(result.stripped).toBe(true);
  const target = new URL(result.target, "http://localhost");
  expect(target.searchParams.get("next")).toBe("/x");
  expect(target.searchParams.get("registered")).toBe("true");
});

test("strip: drops unknown params with the credentials", () => {
  const result = stripCredentialParams(
    new URLSearchParams("password=probe-not-a-secret&debug=1"),
  );
  expect(result).toEqual({ stripped: true, target: "/login" });
});

test("strip: no password param means no strip", () => {
  const result = stripCredentialParams(
    new URLSearchParams("next=/properties&registered=true"),
  );
  expect(result).toEqual({ stripped: false, target: "" });
});

test("strip: empty query means no strip", () => {
  const result = stripCredentialParams(new URLSearchParams(""));
  expect(result).toEqual({ stripped: false, target: "" });
});

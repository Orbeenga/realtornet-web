import { expect, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const BANNER_TEXT = "Credentials were removed from the address bar";
const PROBE_VALUE = "probe-not-a-secret";
const PROBE_EMAIL = "probe-not-a-secret@example.com";

test("guard: strips password and email from the URL and shows a banner", async ({
  page,
}) => {
  await page.goto(
    `${BASE_URL}/login?password=${PROBE_VALUE}&email=${encodeURIComponent(PROBE_EMAIL)}&next=/properties`,
  );
  await page.waitForFunction(
    () => !new URL(window.location.href).searchParams.has("password"),
  );
  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.has("password")).toBe(false);
  expect(url.searchParams.has("email")).toBe(false);
  expect(url.searchParams.get("next")).toBe("/properties");

  const banner = page.getByRole("alert").filter({ hasText: BANNER_TEXT });
  await expect(banner).toBeVisible();
  const bannerText = (await banner.textContent()) ?? "";
  expect(bannerText).toContain(BANNER_TEXT);
  expect(bannerText).not.toContain(PROBE_VALUE);
  expect(bannerText).not.toContain(PROBE_EMAIL);
});

test("guard: leaves a clean /login URL untouched with no banner", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/login`);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(BANNER_TEXT)).toHaveCount(0);
});

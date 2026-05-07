import { test, expect } from "@playwright/test";

const baseURL = "https://realtornet-web.vercel.app";
const password = "Markets26_";
const smokeAdminEmail = process.env.SMOKE_ADMIN_EMAIL;
const smokeAdminPassword = process.env.SMOKE_ADMIN_PASSWORD;
const propertiesUrlPattern = /\/properties\/?$/;
const propertiesSearchPattern = /\/properties\/?\?search=lekki$/;
const listingsUrlPattern = /\/account\/listings\/?$/;
const loginUrlPattern = /\/login\/?$/;
const createdUsers = new Map();

function recordCreatedUser(email, userId) {
  createdUsers.set(email, { email, userId });
}

function attachErrorTracking(page, errors) {
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
}

async function expectNoErrors(errors) {
  expect(errors, errors.join("\n")).toEqual([]);
}

async function loginThroughApi(request, email, accountPassword = password) {
  const response = await request.post(`${baseURL}/api/v1/auth/login`, {
    form: {
      username: email,
      password: accountPassword,
      scope: "",
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

async function getCurrentUser(request, token) {
  const response = await request.get(`${baseURL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

async function registerBuyer(page, request) {
  const buyerEmail = `apineorbeenga+buyer-ui-e6-${Date.now()}@gmail.com`;
  await page.goto(`${baseURL}/register`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Apine").fill("E6");
  await page.getByPlaceholder("Orbeenga").fill("Buyer");
  await page.getByPlaceholder("you@example.com").fill(buyerEmail);
  await page.locator('input[type="password"]').nth(0).fill(password);
  await page.locator('input[type="password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(propertiesUrlPattern);
  const loginPayload = await loginThroughApi(request, buyerEmail);
  const user = await getCurrentUser(request, loginPayload.access_token);
  recordCreatedUser(buyerEmail, user.user_id);

  return buyerEmail;
}

async function registerAccountThroughApi(request, userRole) {
  const roleLabel = userRole === "agent" ? "agent" : "buyer";
  const email = `apineorbeenga+${roleLabel}-api-e6-${Date.now()}-${Math.floor(Math.random() * 1000)}@gmail.com`;
  const response = await request.post(`${baseURL}/api/v1/auth/register`, {
    data: {
      email,
      password,
      first_name: "E6",
      last_name: roleLabel === "agent" ? "Agent" : "Buyer",
      user_role: userRole,
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const user = await response.json();
  recordCreatedUser(email, user.user_id);
  return email;
}

async function cleanupRegisteredAccounts(request) {
  if (createdUsers.size === 0) {
    return;
  }

  let cleanupToken = null;

  if (smokeAdminEmail && smokeAdminPassword) {
    const adminLogin = await loginThroughApi(request, smokeAdminEmail, smokeAdminPassword);
    cleanupToken = adminLogin.access_token;
  }

  const failures = [];

  for (const account of createdUsers.values()) {
    try {
      let token = cleanupToken;
      let userId = account.userId;

      if (!token) {
        const loginPayload = await loginThroughApi(request, account.email);
        token = loginPayload.access_token;
        const user = await getCurrentUser(request, token);
        userId = user.user_id;
      }

      const response = await request.delete(`${baseURL}/api/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok()) {
        failures.push(`${account.email}: ${response.status()} ${await response.text()}`);
      }
    } catch (error) {
      failures.push(
        `${account.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  createdUsers.clear();

  if (failures.length > 0 && smokeAdminEmail && smokeAdminPassword) {
    throw new Error(`Smoke cleanup failed:\n${failures.join("\n")}`);
  }

  if (failures.length > 0) {
    console.warn(
      [
        "Smoke cleanup could not remove all users.",
        "Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD to enable admin teardown.",
        ...failures,
      ].join("\n"),
    );
  }
}

async function login(page, email) {
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("********").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.use({ viewport: { width: 1440, height: 1200 } });

test.afterEach(async ({ request }) => {
  await cleanupRegisteredAccounts(request);
});

test("Journey 1: public properties page loads with seeded listings", async ({
  page,
}) => {
  const errors = [];
  attachErrorTracking(page, errors);

  await page.goto(`${baseURL}/properties`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Discover verified homes across Nigeria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Available properties" })).toBeVisible();
  await expect(page.locator('a[href^="/properties/"]').first()).toBeVisible();
  await expectNoErrors(errors);
});

for (const [index, route] of [
  [2, "/account/favorites"],
  [3, "/account/saved-searches"],
  [4, "/account/inquiries"],
]) {
  test(`Journey ${index}: public access to ${route} redirects to login`, async ({
    page,
  }) => {
    const errors = [];
    attachErrorTracking(page, errors);

    await page.goto(`${baseURL}${route}`);
    await page.waitForURL(loginUrlPattern);
    await expect(page.getByRole("heading", { name: "Sign in to manage your search" })).toBeVisible();
    await expectNoErrors(errors);
  });
}

test("Journey 5: buyer registration via the UI succeeds", async ({ page, request }) => {
  const errors = [];
  attachErrorTracking(page, errors);

  await registerBuyer(page, request);
  await expect(page.getByRole("link", { name: "Favorites" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saved searches" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inquiries" })).toBeVisible();
  await expectNoErrors(errors);
});

test("Journey 6: buyer can save, run, and delete a saved search", async ({
  page,
  request,
}) => {
  const errors = [];
  attachErrorTracking(page, errors);

  const buyerEmail = await registerAccountThroughApi(request, "seeker");
  await login(page, buyerEmail);
  const searchInput = page.getByLabel("Search properties");
  await searchInput.fill("lekki");
  await searchInput.press("Enter");
  await page.waitForURL(propertiesSearchPattern);

  await page.getByRole("button", { name: "Save search" }).click();
  await page.getByPlaceholder("Optional name, e.g. Lekki rentals").fill("Lekki smoke search");
  await page.getByRole("button", { name: "Save current search" }).click();
  await page.goto(`${baseURL}/account/saved-searches`, { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Saved searches" })).toBeVisible();
  await expect(page.getByText("Lekki smoke search")).toBeVisible();

  await page.getByRole("button", { name: "Run search" }).click();
  await page.waitForURL(propertiesSearchPattern);

  await page.goto(`${baseURL}/account/saved-searches`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "You haven't saved any searches yet" })).toBeVisible();
  await expectNoErrors(errors);
});

test("Journey 7: buyer favorites page loads without silent failures", async ({
  page,
  request,
}) => {
  const errors = [];
  attachErrorTracking(page, errors);

  const buyerEmail = await registerAccountThroughApi(request, "seeker");
  await login(page, buyerEmail);
  await page.goto(`${baseURL}/account/favorites`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Saved properties" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You haven't saved any properties yet" })).toBeVisible();
  await expectNoErrors(errors);
});

test("Journey 8: buyer inquiries page loads without silent failures", async ({
  page,
  request,
}) => {
  const errors = [];
  attachErrorTracking(page, errors);

  const buyerEmail = await registerAccountThroughApi(request, "seeker");
  await login(page, buyerEmail);
  await page.goto(`${baseURL}/account/inquiries`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Your inquiries" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You haven't sent any inquiries yet" })).toBeVisible();
  await expectNoErrors(errors);
});

test("Journey 9: buyer is denied access to agent-only listing management", async ({
  page,
  request,
}) => {
  const errors = [];
  attachErrorTracking(page, errors);

  const buyerEmail = await registerAccountThroughApi(request, "seeker");
  await login(page, buyerEmail);
  await page.goto(`${baseURL}/account/listings`);
  await page.waitForURL(propertiesUrlPattern);
  await expect(page.getByRole("heading", { name: "Discover verified homes across Nigeria" })).toBeVisible();
  await expectNoErrors(errors);
});

test("Journey 10: agent account can be created through the live backend", async ({
  request,
  page,
}) => {
  const agentEmail = await registerAccountThroughApi(request, "agent");
  await login(page, agentEmail);
  await page.waitForURL(listingsUrlPattern);
  await expect(page.getByRole("link", { name: "My Listings" })).toBeVisible();
});

test("Journey 11: agent can access listing dashboard and manage own properties", async ({
  page,
  request,
}) => {
  const errors = [];
  attachErrorTracking(page, errors);

  const agentEmail = await registerAccountThroughApi(request, "agent");
  await login(page, agentEmail);
  await page.goto(`${baseURL}/account/listings`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "My listings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Listing" }).first()).toBeVisible();
  await expectNoErrors(errors);
});

test("Journey 12: production seed data prerequisites are present for listing-based journeys", async ({
  request,
}) => {
  const [propertiesResponse, propertyTypesResponse, locationsResponse, agentsResponse] =
    await Promise.all([
      request.get(`${baseURL}/api/v1/properties/?skip=0&limit=5`),
      request.get(`${baseURL}/api/v1/property-types/`),
      request.get(`${baseURL}/api/v1/locations/`),
      request.get(`${baseURL}/api/v1/agent-profiles/`),
    ]);

  const [properties, propertyTypes, locations, agents] = await Promise.all([
    propertiesResponse.json(),
    propertyTypesResponse.json(),
    locationsResponse.json(),
    agentsResponse.json(),
  ]);

  expect.soft(Array.isArray(properties) && properties.length > 0, "Expected at least one production property").toBeTruthy();
  expect.soft(Array.isArray(propertyTypes) && propertyTypes.length > 0, "Expected at least one property type").toBeTruthy();
  expect.soft(Array.isArray(locations) && locations.length > 0, "Expected at least one location").toBeTruthy();
  expect.soft(Array.isArray(agents) && agents.length > 0, "Expected at least one public agent profile").toBeTruthy();
  expect(Array.isArray(properties) && properties.length > 0).toBeTruthy();
});

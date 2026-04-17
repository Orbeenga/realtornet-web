const { test, expect } = require("@playwright/test");

const baseURL = "https://realtornet-web.vercel.app";
const password = "Markets26_";
const loginUrlPattern = /\/login\/?$/;
const propertiesUrlPattern = /\/properties\/?$/;
const propertiesSearchPattern = /\/properties\/?\?search=lekki$/;
const listingsUrlPattern = /\/account\/listings\/?$/;

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

async function registerBuyer(page) {
  const buyerEmail = `apineorbeenga+buyer-ui-e6-${Date.now()}@gmail.com`;
  await page.goto(`${baseURL}/register`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Apine").fill("E6");
  await page.getByPlaceholder("Orbeenga").fill("Buyer");
  await page.getByPlaceholder("you@example.com").fill(buyerEmail);
  await page.locator('input[type="password"]').nth(0).fill(password);
  await page.locator('input[type="password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(propertiesUrlPattern);

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
  return email;
}

async function login(page, email) {
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("********").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function logout(page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(loginUrlPattern);
}

test.use({ viewport: { width: 1440, height: 1200 } });

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

test("Journey 5: buyer registration via the UI succeeds", async ({ page }) => {
  const errors = [];
  attachErrorTracking(page, errors);

  await registerBuyer(page);
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

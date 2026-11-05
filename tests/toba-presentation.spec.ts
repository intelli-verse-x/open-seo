import { expect, test, type Page } from "@playwright/test";

// Browser-only empty fixtures: the real router, forms, guards and components run.
// All API requests are intercepted, including mutations, so no database or paid
// provider is touched. These rows are not workspace performance data.
async function installEmptyWorkspace(page: Page, signedIn = false) {
  let hasSession = signedIn;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/get-session"))
      return route.fulfill({
        json: hasSession
          ? {
              user: {
                id: "fixture",
                name: "Operator",
                email: "operator@example.invalid",
                emailVerified: true,
              },
              session: { id: "fixture", userId: "fixture" },
            }
          : null,
      });
    if (path.endsWith("/sign-out")) {
      hasSession = false;
      return route.fulfill({ json: { success: true } });
    }
    if (path.endsWith("/sign-up-status"))
      return route.fulfill({ json: { firstAccount: false } });
    if (path.endsWith("/sign-in/social"))
      return route.fulfill({
        status: 400,
        json: { message: "Google sign in is not configured." },
      });
    if (path.endsWith("/sign-up/email"))
      return route.fulfill({
        status: 403,
        json: {
          message:
            "Registration is closed. Ask your administrator for an invitation.",
        },
      });
    if (path.endsWith("/api-key/list"))
      return route.fulfill({ json: { apiKeys: [], total: 0 } });
    return route.fulfill({
      status: 503,
      json: { message: "Unavailable in this empty fixture." },
    });
  });
  await page.route("**/_serverFn/**", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop()!;
    const name = JSON.parse(
      Buffer.from(id, "base64url").toString(),
    ).export.split("_createServerFn")[0];
    const fixtures: Record<string, unknown> = {
      getProjects: [
        {
          id: "fixture",
          name: "Default",
          domain: "example.invalid",
          locationCode: 2840,
          languageCode: "en",
        },
      ],
      getProjectAccess: { projectId: "fixture" },
      getOrganizationContext: {
        organizationId: "fixture",
        role: "owner",
        organizations: [],
      },
      getSeoApiKeyStatus: { configured: false },
      getDashboardActivation: {
        domain: null,
        ga4: { connected: false },
        gsc: { connected: false, siteUrl: null },
        mcp: { authorizedAt: null, firstToolCallAt: null, cardDismissed: true },
        dismissedSteps: [],
      },
      getDashboardOverview: { audit: null },
      getRankTrackingConfigSummaries: [],
      getScheduledRankChecksPaused: { paused: false },
      getTeam: { members: [], invitations: [] },
      getSavedKeywords: { rows: [], tags: [], totalCount: 0 },
      getProject: { id: "fixture", name: "Default", domain: null },
      getAuditHistory: [],
      getAuditCapabilities: { canRenderJavaScript: false },
      getAiResearchSetup: { status: "ready" },
      getSamAccessSetupStatus: { enabled: true },
    };
    if (!(name in fixtures))
      return route.fulfill({
        status: 503,
        json: { error: { message: "Unavailable in this empty fixture." } },
      });
    return route.fulfill({ json: { result: fixtures[name], context: {} } });
  });
}

test("password sign-in preserves the Figma controls and Google error", async ({
  page,
}) => {
  await installEmptyWorkspace(page);
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: /Rank higher on Google/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Password", { exact: true })).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(
    page.getByText("Google sign in is not configured."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("closed registration keeps the form and terms visible", async ({
  page,
}) => {
  await installEmptyWorkspace(page);
  await page.goto("/sign-up");
  await expect(
    page.getByRole("button", { name: "Sign up with Google" }),
  ).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).fill("Test operator");
  await page
    .getByLabel("Work email", { exact: true })
    .fill("operator@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Only-a-browser-fixture-123!");
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText(/Registration is closed/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeEnabled();
});

test("password recovery never claims mail was sent", async ({ page }) => {
  await installEmptyWorkspace(page);
  await page.goto("/forgot-password");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("operator@example.invalid");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/Mail is not configured/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await page.goto("/verify-email");
  await page.getByRole("button", { name: "Resend link" }).click();
  await expect(page.getByText(/Mail is not configured/)).toBeVisible();
});

const frames = [
  ["/sign-in", "login", "Welcome back"],
  ["/sign-up", "sign-up", "Create your account"],
  ["/forgot-password", "forgot-password", "Reset your password"],
  ["/verify-email", "verify-email", "Check your email"],
  ["/p/fixture", "dashboard", "Welcome back, Operator"],
  ["/p/fixture/keywords", "keyword-research", "Keyword Research"],
  ["/p/fixture/saved", "saved-keywords", "Saved Keywords"],
  ["/p/fixture/rank-tracking", "rank-tracking", "Rank Tracking"],
  ["/p/fixture/domain", "domain-overview", "Domain Overview"],
  ["/p/fixture/backlinks", "backlinks", "Backlinks"],
  ["/p/fixture/audit", "site-audit", "Site Audit"],
  ["/p/fixture/brand-lookup", "brand-lookup", "Brand Lookup"],
  ["/p/fixture/prompt-explorer", "prompt-explorer", "Prompt Explorer"],
  ["/ai", "ai-mcp", "AI & MCP"],
  ["/settings", "settings", "Settings"],
] as const;
for (const [index, [route, name, heading]] of frames.entries()) {
  test(`${name}: real route at 1440px`, async ({ page }) => {
    await page.setViewportSize({
      width: 1440,
      height: index < 4 ? 1024 : 1180,
    });
    await installEmptyWorkspace(page, index >= 4);
    await page.goto(route);
    await page.locator("h1").first().waitFor({ timeout: 60_000 });
    if (index >= 4) {
      const dismiss = page.getByRole("button", {
        name: "Dismiss",
        exact: true,
      });
      await dismiss.click();
      await expect(
        page.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `evidence/${name}-1440.png` });
  });
}

test("all app routes redirect a signed-out operator to sign-in", async ({
  page,
}) => {
  await installEmptyWorkspace(page);
  for (const [route] of frames.slice(4)) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByLabel("Email address", { exact: true }),
    ).toBeEnabled();
  }
});

test("sidebar Sign out invokes the existing sign-out flow", async ({
  page,
}) => {
  await installEmptyWorkspace(page, true);
  await page.goto("/p/fixture");
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  const signOut = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/sign-out"),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signOut;
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByLabel("Email address", { exact: true })).toBeEnabled();
});

test("account form stays usable on phones and with larger text", async ({
  page,
}) => {
  await installEmptyWorkspace(page);
  await page.goto("/sign-in");
  for (const [width, height] of [
    [390, 844],
    [375, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "24px";
    document.documentElement.dataset.theme = "openseo-dark";
  });
  await expect(page.getByLabel("Email address", { exact: true })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".toba-auth-shell")
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(245, 239, 227)");
});

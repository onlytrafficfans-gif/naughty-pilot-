import { test, expect } from "@playwright/test";
test("creator onboarding, tracked links, real metrics, campaigns, integrations and peer swap", async ({
  page,
  context,
}, testInfo) => {
  const issues: string[] = [];
  page.on("pageerror", (e) => issues.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") issues.push(m.text());
  });
  await page.goto("/");
  const email = `browser-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("safe-test-password");
  await page.getByLabel("I confirm I am 18 years or older.").check();
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make it yours." }),
  ).toBeVisible();
  await page.getByLabel("Display name", { exact: true }).fill("Taylor Studio");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Creator page URL").fill("https://example.com/taylor");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Website URL (optional)")
    .fill("https://creator.example");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Opt into Peer Swap creator discovery.").check();
  await page
    .getByRole("button", { name: "Continue without integrations" })
    .click();
  await page
    .getByLabel("Campaign name", { exact: true })
    .fill("First Reddit campaign");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Open my cockpit" }).click();
  await expect(
    page.getByRole("heading", { name: "Your growth, at a glance." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No traffic recorded yet. Share a tracked link to see which sources work.",
      { exact: true },
    ),
  ).toBeVisible();
  const state = await (await context.request.get("/api/cockpit/state")).json();
  expect(state.metrics.visitors).toBe(0);
  expect(state.links).toHaveLength(1);
  const link = state.links[0];
  await context.request.get(new URL(link.url).pathname, { maxRedirects: 0 });
  await page.reload();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Total Clicks" })
      .locator("strong"),
  ).toHaveText("1");
  const navigation = page.getByRole("navigation", {
    name:
      testInfo.project.name === "mobile"
        ? "Mobile navigation"
        : "Primary navigation",
    exact: true,
  });
  const search = page.getByRole("searchbox", {
    name: "Search sources, campaigns, or links",
  });
  await search.fill("no-match-fixture-993");
  await expect(
    page.getByText("No matching sources, campaigns, or links."),
  ).toBeVisible();
  await search.press("Escape");
  await expect(
    page.getByRole("region", { name: "Search results" }),
  ).toHaveCount(0);
  await search.fill("First Reddit");
  await page
    .getByRole("region", { name: "Search results" })
    .getByRole("button", { name: /First Reddit campaign.*Link$/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Tracked link details" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("code")).toHaveText(link.url);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Show QR code" })
    .click();
  await expect(
    page.getByRole("img", { name: "QR code for First Reddit campaign" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .locator(".np-activity")
    .getByRole("button", { name: "See All" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Recent activity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .locator(".np-templates")
    .getByRole("button", { name: "View All" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Campaign templates" }),
  ).toBeVisible();
  await page
    .locator(".np-template-picker")
    .getByRole("button", { name: /Story promotion/ })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Campaign name"),
  ).toHaveValue("Story promotion");
  await expect(
    page.getByRole("dialog").getByLabel("Traffic source"),
  ).toHaveValue("Instagram");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await search.fill("First Reddit");
  await page
    .getByRole("region", { name: "Search results" })
    .getByRole("button", { name: /First Reddit campaign.*Campaign/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(search).toHaveValue("");
  await page
    .locator(".np-template-grid")
    .getByRole("button", { name: /Social launch/ })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Campaign name"),
  ).toHaveValue("Social launch");
  await expect(
    page.getByRole("dialog").getByLabel("Traffic source"),
  ).toHaveValue("Reddit");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .locator(".np-channel-grid")
    .getByRole("button", { name: /TikTok/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "No campaigns for this source" }),
  ).toBeVisible();
  await navigation.getByRole("button", { name: "Home", exact: true }).click();
  await navigation.getByRole("button", { name: "Links", exact: true }).click();
  await page
    .getByRole("button", { name: "QR code for First Reddit campaign" })
    .click();
  await expect(
    page.getByRole("img", { name: "QR code for First Reddit campaign" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await navigation
    .getByRole("button", { name: "Campaigns", exact: true })
    .click();
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Campaign name", { exact: true })
    .fill("Instagram launch");
  await dialog
    .getByLabel("Traffic source", { exact: true })
    .selectOption("Instagram");
  await dialog
    .getByRole("button", { name: "Create campaign & link", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Instagram launch", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Campaign source filter").selectOption("Reddit");
  await expect(
    page.getByRole("heading", { name: "First Reddit campaign", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Instagram launch", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Campaign source filter").selectOption("All sources");
  await page.getByLabel("Compare First Reddit campaign").check();
  await page.getByLabel("Compare Instagram launch").check();
  await page.getByRole("button", { name: "Compare (2)", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("cell", { name: "Instagram launch", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await navigation
    .getByRole("button", { name: "Analytics", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record conversion", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tracking link (optional)")
    .selectOption(link.id);
  await page.getByRole("dialog").getByLabel("Revenue (USD)").fill("19");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record conversion", exact: true })
    .click();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Attributed conversions" })
      .locator("strong"),
  ).toHaveText("1");
  await navigation
    .getByRole("button", { name: "Traffic", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "$19.00", exact: true }).first(),
  ).toBeVisible();
  await navigation
    .getByRole("button", { name: "Account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run diagnostics", exact: true })
    .click();
  await expect(
    page.getByText(/No events received. Install the script/),
  ).toBeVisible();
  const instagram = page
    .locator(".connections-list>div")
    .filter({ has: page.getByText("Instagram", { exact: true }) });
  await instagram
    .getByRole("button", { name: "Check setup", exact: true })
    .click();
  await expect(
    instagram.getByText("Official API integration is not configured.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load sample traffic", exact: true })
    .click();
  await expect(
    page.getByText("Development sample data is visible.", { exact: true }),
  ).toBeVisible();
  await navigation.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Traffic generated" })
      .locator("strong"),
  ).toHaveText("87");
  await page.locator(".np-partners button").first().click();
  await expect(
    page.getByRole("dialog", { name: "Propose a Peer Swap" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".toast")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/workspace/naughty-pilot-/work/dashboard-foundation-${testInfo.project.name}.png`,
  });
  await page.screenshot({
    path: `/workspace/naughty-pilot-/work/cockpit-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigation
    .getByRole("button", { name: "Peer Swap", exact: true })
    .click();
  const peer = page
    .locator(".peer-card")
    .filter({ has: page.getByRole("heading", { name: /Sam Rivera/ }) });
  await peer.getByRole("button", { name: "Propose swap" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send swap request" })
    .click();
  await page
    .getByRole("button", { name: "Simulate acceptance", exact: true })
    .click();
  await page.getByRole("button", { name: "Results", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Not enough data", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Copy partner link" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mark collaboration complete" })
    .click();
  await expect(
    page.locator(".swap-item").getByText("completed", { exact: true }),
  ).toBeVisible();
  // The page must fit the viewport; wide tables may scroll within their own containers.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/workspace/naughty-pilot-/work/peer-swap-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigation
    .getByRole("button", { name: "Account", exact: true })
    .click();
  await page
    .locator(".development-panel")
    .getByRole("button", { name: "Clear samples", exact: true })
    .click();
  await expect(
    page.getByText("Development sample data is visible.", { exact: true }),
  ).toHaveCount(0);
  for (const provider of ["OnlyFans", "Fansly", "Patreon", "Pornhub"]) {
    await expect(
      page.getByRole("article", { name: `${provider} subscriber connection` }),
    ).toBeVisible();
  }
  const patreon = page.getByRole("article", {
    name: "Patreon subscriber connection",
  });
  await expect(
    patreon.getByRole("button", { name: "Connect Patreon" }),
  ).toBeDisabled();
  const onlyfans = page.getByRole("article", {
    name: "OnlyFans subscriber connection",
  });
  await onlyfans.getByRole("button", { name: "Add creator page" }).click();
  await page
    .getByLabel("OnlyFans creator URL")
    .fill("https://onlyfans.com/taylor");
  await page.getByLabel("Current paid subscribers (optional)").fill("123");
  await page
    .getByRole("button", { name: "Save creator page", exact: true })
    .click();
  await expect(onlyfans.locator(".subscriber-number strong")).toHaveText("123");
  await onlyfans.getByRole("button", { name: "Use on Home" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/workspace/naughty-pilot-/work/subscription-connections-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigation.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Current subscribers" })
      .locator("strong"),
  ).toHaveText("123");
  await navigation
    .getByRole("button", { name: "Account", exact: true })
    .click();
  const openScreen = async (name: string) => {
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "More screens" }).click();
      await page
        .getByRole("dialog", { name: "All screens" })
        .getByRole("button", { name, exact: true })
        .click();
    } else await navigation.getByRole("button", { name, exact: true }).click();
  };
  await openScreen("Content Library");
  await page
    .getByRole("button", { name: "Add content reference", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Launch media");
  await page
    .getByLabel("Public content URL")
    .fill("https://example.com/creator-media");
  await page.getByLabel("Caption / notes").fill("My launch caption");
  await page
    .getByRole("button", { name: "Save content reference", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Launch media", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Launch media", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use in campaign", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Campaign name"),
  ).toHaveValue("Launch media");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  if (testInfo.project.name === "desktop")
    await expect(
      page.getByRole("img", { name: "NP", exact: true }),
    ).toBeVisible();
  else
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation", exact: true }),
    ).toBeVisible();
  await page.screenshot({
    path: `/workspace/naughty-pilot-/work/content-library-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await openScreen("Templates");
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Saved launch preset");
  await page
    .getByLabel("Destination URL (optional)")
    .fill("https://onlyfans.com/taylor");
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use in campaign", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Campaign name"),
  ).toHaveValue("Saved launch preset");
  await expect(
    page.getByRole("dialog").getByLabel("Destination URL"),
  ).toHaveValue("https://onlyfans.com/taylor");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await openScreen("Automation");
  await page
    .getByRole("button", { name: "Add promotion reminder", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Post launch reminder");
  await page.getByLabel("Due date and time").fill("2026-01-01T12:00");
  await page
    .getByRole("button", { name: "Save promotion reminder", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Post launch reminder", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(
    page
      .locator(".np-workspace-cards")
      .getByText("Reddit · completed", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/workspace/naughty-pilot-/work/automation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await openScreen("Subscriptions");
  await expect(
    page.getByRole("article", { name: "OnlyFans subscriber connection" }),
  ).toBeVisible();
  await openScreen("Settings");
  await expect(
    page.getByRole("heading", { name: "Your preferences and privacy." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".np-settings-view .account-connections"),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await openScreen("Account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("safe-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your growth, at a glance." }),
  ).toBeVisible();
  expect(issues).toEqual([]);
});

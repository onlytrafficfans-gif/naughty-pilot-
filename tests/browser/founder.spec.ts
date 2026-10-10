import { test, expect } from "@playwright/test";
test("founder controls preserve cockpit and enforce pause and explicit approval", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Email address").fill("founder@example.com");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your growth, at a glance." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Founder controls", exact: true })
    .click();
  const controls = page.getByRole("region", { name: "Founder controls" });
  await expect(
    controls.getByText("Real spending is disabled.", { exact: false }),
  ).toBeVisible();
  if (
    await controls.getByRole("button", { name: "Resume planning" }).isEnabled()
  )
    await controls.getByRole("button", { name: "Resume planning" }).click();
  await expect(
    controls.getByRole("button", { name: "Generate proposal" }),
  ).toBeEnabled();
  await controls.getByLabel("Campaign budget (USD)").fill("10");
  await controls.getByLabel("Daily cap (USD, UTC)").fill("5");
  await controls
    .getByRole("button", { name: "Approve revision 1 and budget" })
    .click();
  await expect(controls.getByText(/Revision 1 · approved/)).toBeVisible();
  await controls.getByLabel("Brief").fill("Create a planning proposal");
  await controls.getByRole("button", { name: "Generate proposal" }).click();
  await expect(
    controls.getByText("Browser fixture proposal", { exact: true }),
  ).toBeVisible();
  await controls.getByRole("button", { name: "Emergency pause" }).click();
  await expect(
    controls.getByRole("button", { name: "Generate proposal" }),
  ).toBeDisabled();
  await expect(controls.getByText(/Revision 1 · paused/)).toBeVisible();
  const admin = await (await context.request.get("/api/cockpit/admin")).json();
  expect(admin.controls.real_spending_enabled).toBe(false);
  expect(admin.controls.paused).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: info.outputPath("founder-controls.png"),
    fullPage: true,
  });
});

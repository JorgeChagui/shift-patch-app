import { expect, test, type Page } from "@playwright/test";

// Read-only smoke checks: each role signs in through the UI and each page renders its
// required data-testids. Mutating flows (claim, cancel, post) are covered in Phase 4.

const PASSWORD = "Trial2026!";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("/ sends a visitor to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-email-input")).toBeVisible();
  await expect(page.getByTestId("login-password-input")).toBeVisible();
  await expect(page.getByTestId("login-submit-button")).toBeVisible();
});

test("a wrong password shows the error banner", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill("maria.lopez@example.com");
  await page.getByTestId("login-password-input").fill("not-the-password");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("notification-banner")).toHaveText("Invalid email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("nurse pages render their test IDs", async ({ page }) => {
  await loginAs(page, "maria.lopez@example.com");
  await expect(page).toHaveURL(/\/shifts$/);
  await expect(page.getByTestId("shift-list-item").first()).toBeVisible();
  await expect(page.getByTestId("shift-claim-button").first()).toBeVisible();
  await expect(page.getByTestId("shift-cancel-button").first()).toBeVisible();

  await page.getByRole("link", { name: "Credentials" }).click();
  await expect(page.getByTestId("credential-upload-input")).toBeVisible();
  await expect(page.getByTestId("credential-expiry-date-input")).toBeVisible();
});

test("a nurse with an expired license is warned", async ({ page }) => {
  await loginAs(page, "james.cook@example.com");
  await expect(page.getByRole("note")).toContainText("Your license expired");
  await expect(page.getByRole("link", { name: "upload a current license" })).toHaveAttribute("href", "/credentials");
});

test("agency pages render their test IDs", async ({ page }) => {
  await loginAs(page, "admin@sunrisehealth.example");
  await expect(page).toHaveURL(/\/agency\/shifts$/);
  await expect(page.getByTestId("shift-cancel-button").first()).toBeVisible();

  await page.getByTestId("agency-post-shift-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("agency-post-shift-submit-button")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Timesheets" }).click();
  await expect(page.getByTestId("timesheet-table")).toBeVisible();
});

test("admin pages render their test IDs", async ({ page }) => {
  await loginAs(page, "alex.kim@example.com");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId("admin-dashboard-shift-table")).toBeVisible();
  const badges = page.getByTestId("admin-shift-status-badge");
  await expect(badges.first()).toBeVisible();
  for (const text of await badges.allTextContents()) expect(["open", "filled", "cancelled"]).toContain(text);

  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page.getByTestId("audit-log-table")).toBeVisible();

  await page.getByRole("link", { name: "Timesheets" }).click();
  await expect(page.getByTestId("timesheet-table")).toBeVisible();
});

test("a signed-in user is kept to their own role's pages", async ({ page }) => {
  await loginAs(page, "maria.lopez@example.com");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/shifts$/);
});

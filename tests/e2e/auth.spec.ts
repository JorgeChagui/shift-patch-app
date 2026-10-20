import { banner, expect, loginViaUi, test } from "./fixtures";

// Read-only: sign-in, role landing pages, role gating and the test IDs that don't depend on
// shift state (other specs claim and cancel in parallel; they assert the row-level IDs).

test("/ sends a visitor to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-email-input")).toBeVisible();
  await expect(page.getByTestId("login-password-input")).toBeVisible();
  await expect(page.getByTestId("login-submit-button")).toBeVisible();
});

test("a signed-out visit to a role page goes to the login page", async ({ page }) => {
  await page.goto("/shifts");
  await expect(page).toHaveURL(/\/login\?next=%2Fshifts$/);
});

test("a wrong password shows the error banner", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill("maria.lopez@example.com");
  await page.getByTestId("login-password-input").fill("not-the-password");
  await page.getByTestId("login-submit-button").click();
  await expect(banner(page)).toHaveText("Invalid email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("a nurse lands on the marketplace", async ({ page }) => {
  await loginViaUi(page, "maria");
  await expect(page).toHaveURL(/\/shifts$/);
  await expect(page.getByRole("heading", { name: "Open shifts" })).toBeVisible();

  await page.getByRole("link", { name: "Credentials" }).click();
  await expect(page.getByTestId("credential-upload-input")).toBeVisible();
  await expect(page.getByTestId("credential-expiry-date-input")).toBeVisible();
});

test("a nurse with an expired license is warned", async ({ page }) => {
  await loginViaUi(page, "james");
  await expect(page.getByRole("note")).toContainText("Your license expired");
  await expect(page.getByRole("link", { name: "upload a current license" })).toHaveAttribute("href", "/credentials");
});

test("an agency lands on its shifts", async ({ page }) => {
  await loginViaUi(page, "agencyA");
  await expect(page).toHaveURL(/\/agency\/shifts$/);

  await page.getByTestId("agency-post-shift-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("agency-post-shift-submit-button")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Timesheets" }).click();
  await expect(page.getByTestId("timesheet-table")).toBeVisible();
});

test("an admin lands on the dashboard", async ({ page }) => {
  await loginViaUi(page, "admin");
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

test("a nurse visiting /admin is sent back to their own home", async ({ page }) => {
  await loginViaUi(page, "maria");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/shifts$/);
});

test("an agency visiting a nurse page is sent back to their own home", async ({ page }) => {
  await loginViaUi(page, "agencyB");
  await page.goto("/shifts");
  await expect(page).toHaveURL(/\/agency\/shifts$/);
});

test("pages send the security headers and run clean under the CSP", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  const res = await page.goto("/login");
  const headers = res!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();

  // Sign in and load the live dashboard (SSE) to catch anything the CSP would block.
  await loginViaUi(page, "admin");
  await expect(page.getByTestId("admin-dashboard-shift-table")).toBeVisible();
  expect(violations).toEqual([]);
});

test("?next= can't send the user to another site", async ({ page }) => {
  await page.goto("/login?next=%2F%5Cevil.example");
  await page.getByTestId("login-email-input").fill("maria.lopez@example.com");
  await page.getByTestId("login-password-input").fill("Trial2026!");
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/shifts$/);
});

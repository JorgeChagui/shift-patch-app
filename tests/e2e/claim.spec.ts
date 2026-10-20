import path from "node:path";
import { auditRows, banner, expect, loginViaUi, shiftRow, test } from "./fixtures";

// Uses shift-1 (Maria) and shift-3 (James) only.

test("Maria claims shift-1 and it shows as filled, audited, with a timesheet", async ({ page, pageAs }) => {
  await loginViaUi(page, "maria");
  const openRow = page.getByRole("region", { name: "Open shifts" }).getByTestId("shift-list-item").and(shiftRow(page, "shift-1"));
  await expect(openRow).toContainText("RN at Sunrise Health Staffing");
  await openRow.getByTestId("shift-claim-button").click();

  await expect(banner(page)).toHaveText("Shift claimed");
  await expect(openRow).toHaveCount(0);
  const mine = page.getByRole("region", { name: "My shifts" }).locator(shiftRow(page, "shift-1"));
  await expect(mine).toContainText("filled");
  await expect(mine.getByTestId("shift-cancel-button")).toBeVisible();

  const admin = await pageAs("admin");
  await expect(await auditRows(admin, "Claimed shift", "shift-1")).toContainText("Maria Lopez");
  await admin.goto("/admin/timesheets");
  const timesheet = admin.getByTestId("timesheet-table").locator(shiftRow(admin, "shift-1"));
  await expect(timesheet).toContainText("Maria Lopez");
  await expect(timesheet).toContainText("12");
  await expect(timesheet).toContainText("pending");
});

test.describe("James, whose license expired", () => {
  test.describe.configure({ mode: "serial" });

  test("is blocked from claiming shift-3", async ({ page, pageAs }) => {
    await loginViaUi(page, "james");
    await shiftRow(page, "shift-3").getByTestId("shift-claim-button").click();
    await expect(banner(page)).toHaveText("Credential expired, cannot claim shift");
    await expect(shiftRow(page, "shift-3")).toContainText("open");

    const admin = await pageAs("admin");
    await expect(await auditRows(admin, "Claim blocked", "shift-3")).toContainText("James Cook");
  });

  test("uploads a current license, then claims shift-3", async ({ page }) => {
    await loginViaUi(page, "james");
    await page.goto("/credentials");
    await page.getByTestId("credential-expiry-date-input").fill("2028-01-01");
    await page.getByTestId("credential-upload-input").setInputFiles(path.join(__dirname, "files", "license.pdf"));
    await page.getByRole("button", { name: "Upload credential" }).click();
    await expect(banner(page)).toHaveText("Credential uploaded");

    await page.getByRole("link", { name: "Shifts", exact: true }).click();
    await expect(page.getByRole("note")).toHaveCount(0);
    await shiftRow(page, "shift-3").getByTestId("shift-claim-button").click();
    await expect(banner(page)).toHaveText("Shift claimed");
    await expect(page.getByRole("region", { name: "My shifts" }).locator(shiftRow(page, "shift-3"))).toContainText("filled");
  });
});

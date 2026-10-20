import { auditRows, banner, expect, loginViaUi, test } from "./fixtures";

// Posts a new shift; touches no seeded shift.

test("an agency posts a shift and nurses see it in the marketplace", async ({ page, pageAs }) => {
  await loginViaUi(page, "agencyA");
  await page.getByTestId("agency-post-shift-button").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Role").fill("CNA");
  await dialog.getByLabel("Date").fill("2026-11-20");
  await dialog.getByLabel("Starts").fill("08:00");
  await dialog.getByLabel("Ends").fill("16:00");
  await page.getByTestId("agency-post-shift-submit-button").click();

  await expect(banner(page)).toHaveText("Shift posted");
  await expect(dialog).toBeHidden();
  const agencyRow = page.getByRole("row").filter({ hasText: "CNA" });
  await expect(agencyRow).toContainText("open");
  const shiftId = await agencyRow.getAttribute("data-shift-id");
  expect(shiftId).toMatch(/^shift-\d+$/);

  const nurse = await pageAs("maria");
  await nurse.goto("/shifts");
  const listed = nurse.getByTestId("shift-list-item").and(nurse.locator(`[data-shift-id="${shiftId}"]`));
  await expect(listed).toContainText("CNA at Sunrise Health Staffing");
  await expect(listed.getByTestId("shift-claim-button")).toBeVisible();

  const admin = await pageAs("admin");
  await expect(await auditRows(admin, "Posted shift", shiftId!)).toContainText("Sunrise Health Staffing");
});

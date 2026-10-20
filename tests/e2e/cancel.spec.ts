import { auditRows, banner, expect, loginViaUi, shiftRow, test } from "./fixtures";

// Uses shift-2 only (seeded as filled by Maria, with a pending timesheet).

test("an agency cancels shift-2 as a no-show and it reopens", async ({ page, pageAs }) => {
  await loginViaUi(page, "agencyA");
  const row = shiftRow(page, "shift-2");
  await expect(row).toContainText("Maria Lopez");
  await row.getByLabel("Cancellation reason").selectOption("no-show");
  await row.getByTestId("shift-cancel-button").click();

  await expect(banner(page)).toHaveText("Shift cancelled");
  await expect(row).toContainText("open");
  await expect(row).toContainText("Not yet covered");

  const admin = await pageAs("admin");
  await admin.goto("/admin");
  await expect(shiftRow(admin, "shift-2").getByTestId("admin-shift-status-badge")).toHaveText("open");

  await expect(await auditRows(admin, "Cancelled shift", "shift-2")).toContainText("no-show");
  await admin.goto("/admin/timesheets");
  await expect(admin.getByTestId("timesheet-table")).toBeVisible();
  await expect(shiftRow(admin, "shift-2")).toHaveCount(0);
});

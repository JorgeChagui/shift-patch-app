import { expect, shiftRow, test } from "./fixtures";

// Posts its own shift through the API; touches no seeded shift.

test("the admin dashboard updates live when a nurse claims in another browser", async ({ request, apiToken, pageAs }) => {
  const res = await request.post("/api/shifts", {
    headers: { authorization: `Bearer ${await apiToken("agencyB")}` },
    data: { role: "LPN", date: "2026-11-21", startTime: "19:00", endTime: "07:00" },
  });
  expect(res.status()).toBe(201);
  const { id } = (await res.json()) as { id: string };

  const admin = await pageAs("admin");
  await admin.goto("/admin");
  const badge = shiftRow(admin, id).getByTestId("admin-shift-status-badge");
  await expect(badge).toHaveText("open");

  const nurse = await pageAs("maria");
  await nurse.goto("/shifts");
  await shiftRow(nurse, id).getByTestId("shift-claim-button").click();
  await expect(nurse.getByTestId("notification-banner")).toHaveText("Shift claimed");

  // No reload: the SSE stream (3 s DB poll) or the 10 s polling fallback refreshes the table.
  await expect(badge).toHaveText("filled", { timeout: 15_000 });
  await expect(shiftRow(admin, id)).toContainText("Maria Lopez");
});

import { test as base, expect, type Browser, type Page } from "@playwright/test";

export { expect };

export const PASSWORD = "Trial2026!";

export const ACCOUNTS = {
  maria: "maria.lopez@example.com",
  james: "james.cook@example.com",
  agencyA: "admin@sunrisehealth.example",
  agencyB: "admin@metrocare.example",
  admin: "alex.kim@example.com",
} as const;

export type Account = keyof typeof ACCOUNTS;

/** Signs in through the login form and waits to leave /login. */
export async function loginViaUi(page: Page, account: Account) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(ACCOUNTS[account]);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function newSignedInPage(browser: Browser, baseURL: string | undefined, account: Account) {
  const context = await browser.newContext({ baseURL });
  // The login route sets the httpOnly session cookie on this context's cookie jar.
  const res = await context.request.post("/api/auth/login", {
    data: { email: ACCOUNTS[account], password: PASSWORD },
  });
  expect(res.status(), `login as ${account}`).toBe(200);
  return context.newPage();
}

type Fixtures = {
  /** A page in its own browser context, already signed in as `account`. Closed after the test. */
  pageAs: (account: Account) => Promise<Page>;
  /** A Bearer token for API setup calls. */
  apiToken: (account: Account) => Promise<string>;
};

export const test = base.extend<Fixtures>({
  pageAs: async ({ browser, baseURL }, provide) => {
    const pages: Page[] = [];
    await provide(async (account) => {
      const page = await newSignedInPage(browser, baseURL, account);
      pages.push(page);
      return page;
    });
    await Promise.all(pages.map((page) => page.context().close()));
  },
  apiToken: async ({ request }, provide) => {
    await provide(async (account) => {
      const res = await request.post("/api/auth/login", { data: { email: ACCOUNTS[account], password: PASSWORD } });
      expect(res.status(), `login as ${account}`).toBe(200);
      return ((await res.json()) as { token: string }).token;
    });
  },
});

/** A shift's row in any list or table that marks rows with `data-shift-id`. */
export function shiftRow(page: Page, shiftId: string) {
  return page.locator(`[data-shift-id="${shiftId}"]`);
}

/** The single in-app banner (`notification-banner`). */
export function banner(page: Page) {
  return page.getByTestId("notification-banner");
}

/** Rows of the admin audit log for one action label and entity id. */
export async function auditRows(page: Page, actionLabel: string, entityId: string) {
  await page.goto("/admin/audit-log");
  return page
    .getByTestId("audit-log-table")
    .getByRole("row")
    .filter({ hasText: actionLabel })
    .filter({ has: page.getByText(entityId, { exact: true }) });
}

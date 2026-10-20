// P3-09: every required data-testid from the spec appears in src/ on a JSX element.
// Usage: npm run check:testids
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REQUIRED = [
  "login-email-input",
  "login-password-input",
  "login-submit-button",
  "shift-list-item",
  "shift-claim-button",
  "shift-cancel-button",
  "credential-upload-input",
  "credential-expiry-date-input",
  "agency-post-shift-button",
  "agency-post-shift-submit-button",
  "admin-dashboard-shift-table",
  "admin-shift-status-badge",
  "audit-log-table",
  "timesheet-table",
  "notification-banner",
] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const files = sourceFiles("src").map((path) => ({ path, text: readFileSync(path, "utf8") }));
let missing = 0;

for (const id of REQUIRED) {
  // data-testid="id" on an element, or testId="id" passed to a component that sets it.
  const pattern = new RegExp(`(data-testid|testId)="${id}"`, "g");
  const hits = files.flatMap(({ path, text }) => (text.match(pattern) ? [path] : []));
  if (hits.length === 0) missing += 1;
  console.log(`${hits.length > 0 ? "ok     " : "MISSING"} ${id.padEnd(32)} ${hits.join(", ")}`);
}

console.log(missing === 0 ? `\nAll ${REQUIRED.length} test IDs found.` : `\n${missing} test ID(s) missing.`);
process.exit(missing === 0 ? 0 : 1);

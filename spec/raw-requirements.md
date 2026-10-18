# Raw Requirements

## Problem

> Over the past few years we've grown fast, and problems that used to be simple are now a real headache—with nursing staffing being the biggest one.

> Currently, when we're short-staffed, filling shifts is a manual, time-consuming nightmare.

## Main features by role

1. Healthcare facilities: post open nursing shifts when they need someone on short notice.
2. Nurses: browse those openings and pick up the ones that work for them.
3. Administrator: keeps an eye on everything as it happens, tracking which shifts are still open and which have been filled.

## Additional Requirements mentioned in the Founder’s brief and overall document

1. A platform where available shifts are posted to a real-time dashboard
2. The team should know which shifts are covered and by whom.
3. Repo with passing CI: Type checks, lint, and your own tests all green. Keep secrets out of git history.

## The founder's full wish list

1. Three roles with real permissions: agency, nurse, admin
2. Authentication
3. Credential upload with expiry dates
4. Shift matching that blocks nurses with lapsed credentials
5. Cancellation and no-show handling
6. Email notifications
7. Timesheets
8. Admin dashboard with reporting
9. Audit log
10. One-click export of nurses' license documents and TB test results, so we can hand it to the state inspector when they ask
11. PostHog analytics set up
12. Deployed to a real URL

## My commitment

My committed scope for the ShiftPatch assessment includes:

- Authentication & Role-Based Access: Real permissions for Agency, Nurse, and Admin roles.
- Credential Compliance: Credential upload with expiration date tracking, blocking shift claims for nurses with lapsed credentials.
- Shift Lifecycle: Posting open shifts (Agency), marketplace browsing & claiming (Nurse), and cancellation/no-show workflows.
- Reporting & Admin Views: Admin dashboard with shift status reporting, basic timesheet tracking, and audit logging.
- Production Deployment: Live public deployment loaded with the provided sample data, green CI pipeline, and exact compliance with all required API contracts and test IDs.
- To deliver a clean, robust architecture and well-tested UX within the 8-hour target, external third-party integrations such as live email delivery services (SendGrid/Resend) and PostHog analytics will be handled via in-app notification banners and event logging.

// Sample data from spec/ShiftPatch-Technical-Spec.md ("Sample data"). Keep it exact.

export const SEED_PASSWORD = "Trial2026!";

export const agencies = [
  { id: "agency-a", name: "Sunrise Health Staffing" },
  { id: "agency-b", name: "Metro Care Partners" },
] as const;

export const users = [
  {
    id: "agency-a-admin",
    name: "Sunrise Health Staffing",
    email: "admin@sunrisehealth.example",
    role: "agency",
    agencyId: "agency-a",
  },
  {
    id: "agency-b-admin",
    name: "Metro Care Partners",
    email: "admin@metrocare.example",
    role: "agency",
    agencyId: "agency-b",
  },
  { id: "nurse-1", name: "Maria Lopez", email: "maria.lopez@example.com", role: "nurse", agencyId: null },
  { id: "nurse-2", name: "James Cook", email: "james.cook@example.com", role: "nurse", agencyId: null },
  { id: "admin-1", name: "Alex Kim", email: "alex.kim@example.com", role: "admin", agencyId: null },
] as const;

export const credentials = [
  { id: "credential-nurse-1-license", nurseId: "nurse-1", type: "license", expiresAt: "2027-01-01" },
  { id: "credential-nurse-2-license", nurseId: "nurse-2", type: "license", expiresAt: "2026-06-01" },
] as const;

export const shifts = [
  { id: "shift-1", agencyId: "agency-a", role: "RN", date: "2026-10-02", startTime: "19:00", endTime: "07:00", status: "open", claimedById: null },
  { id: "shift-2", agencyId: "agency-a", role: "LPN", date: "2026-10-03", startTime: "07:00", endTime: "19:00", status: "filled", claimedById: "nurse-1" },
  { id: "shift-3", agencyId: "agency-b", role: "RN", date: "2026-10-04", startTime: "19:00", endTime: "07:00", status: "open", claimedById: null },
] as const;

/** Highest seeded shift number; the next created shift is shift-(n+1). */
export const LAST_SEEDED_SHIFT_NUMBER = shifts.length;

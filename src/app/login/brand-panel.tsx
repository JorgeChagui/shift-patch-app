import { BrandMark } from "@/components/app-shell/brand-mark";
import { ShiftStatusBadge } from "@/components/shift/shift-status-badge";
import { ShiftTimeStrip } from "@/components/shift/shift-time-strip";
import { ShiftTimes } from "@/components/shift/shift-times";
import type { ShiftStatus } from "@/generated/prisma/enums";

// Illustration only: the shape of the board a user is about to see.
const SAMPLE: { role: string; agency: string; startTime: string; endTime: string; status: ShiftStatus }[] = [
  { role: "RN", agency: "Sunrise Health", startTime: "19:00", endTime: "07:00", status: "open" },
  { role: "LPN", agency: "Sunrise Health", startTime: "07:00", endTime: "19:00", status: "filled" },
  { role: "RN", agency: "Metro Care", startTime: "19:00", endTime: "07:00", status: "open" },
];

/** The login page's left side: what ShiftPatch does, shown as the shift board itself. */
export function BrandPanel() {
  return (
    <div className="flex flex-col justify-between gap-10 bg-brand-wash px-6 py-8 sm:px-10 lg:py-12">
      <BrandMark />
      {/* Centered on wide screens to mirror the form; the logo and footer keep the panel's edge. */}
      <div className="w-full max-w-md space-y-6 lg:mx-auto 2xl:max-w-lg">
        <h1 className="text-3xl leading-tight sm:text-[2.5rem]">Every shift covered, by a nurse who&apos;s cleared to work it.</h1>
        <p className="text-lg text-ink-muted">
          Agencies post open shifts. Nurses with a current license claim them. Admins watch coverage as it happens.
        </p>
        <ul className="space-y-2" aria-label="Example shifts">
          {SAMPLE.map((shift, i) => (
            <li key={i} className="flex items-center gap-4 rounded-lg border bg-surface px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {shift.role} <span className="font-normal text-ink-muted">at {shift.agency}</span>
                </p>
                <p className="text-sm text-ink-muted">
                  <ShiftTimes startTime={shift.startTime} endTime={shift.endTime} />
                </p>
              </div>
              <ShiftTimeStrip {...shift} className="hidden w-32 sm:block" />
              <ShiftStatusBadge status={shift.status} />
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-ink-muted">Built for the ShiftPatch technical assessment.</p>
    </div>
  );
}

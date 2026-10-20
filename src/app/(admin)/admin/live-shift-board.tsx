"use client";

import type { AdminShiftsDto } from "@/lib/dto";
import { useLiveShifts } from "@/hooks/use-live-shifts";
import { AdminShiftTable } from "./admin-shift-table";
import { LiveIndicator } from "./live-indicator";
import { StatusCounts } from "./status-counts";

export function LiveShiftBoard({ initial }: { initial: AdminShiftsDto }) {
  const { data, mode } = useLiveShifts(initial);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap-reverse items-start justify-between gap-3">
        <StatusCounts counts={data.counts} />
        <LiveIndicator mode={mode} />
      </div>
      <AdminShiftTable shifts={data.shifts} />
    </div>
  );
}

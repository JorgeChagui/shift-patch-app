import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { TimesheetsSection } from "@/components/timesheets/timesheets-section";

export const metadata: Metadata = { title: "Timesheets" };

export default function AgencyTimesheetsPage() {
  return (
    <>
      <PageHeader title="Timesheets" description="One per claimed shift. Approve hours once the shift is worked." />
      <Suspense fallback={<TableSkeleton />}>
        <TimesheetsSection role="agency" />
      </Suspense>
    </>
  );
}

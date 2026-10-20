import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { AgencyShiftTable } from "./agency-shift-table";
import { PostShiftDialog } from "./post-shift-dialog";

export const metadata: Metadata = { title: "Agency shifts" };

export default function AgencyShiftsPage() {
  return (
    <>
      <PageHeader
        title="Your shifts"
        description="Post open shifts, see who's covering them, and cancel or withdraw when plans change."
        action={<PostShiftDialog />}
      />
      <Suspense fallback={<TableSkeleton />}>
        <AgencyShiftTable />
      </Suspense>
    </>
  );
}

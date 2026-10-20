import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeletons";
import { getAdminShifts } from "@/lib/data/shifts";
import { requireSession } from "@/lib/session";
import { LiveShiftBoard } from "./live-shift-board";

export const metadata: Metadata = { title: "Dashboard" };

/** Server-renders the current board, then LiveShiftBoard keeps it current over SSE. */
async function Dashboard() {
  await requireSession("admin");
  return <LiveShiftBoard initial={await getAdminShifts()} />;
}

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader title="Coverage" description="Every shift across agencies, and who is covering it. Updates as it happens." />
      <Suspense fallback={<PageSkeleton table />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

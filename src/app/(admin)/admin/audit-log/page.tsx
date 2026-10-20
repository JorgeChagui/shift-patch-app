import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { AuditLogSection } from "./audit-log-section";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  return (
    <>
      <PageHeader title="Audit log" description="Every change anyone made, newest first. Times are in UTC." />
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <AuditLogSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

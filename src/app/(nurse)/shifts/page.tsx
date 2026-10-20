import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { CredentialWarning } from "./credential-warning";
import { MyShifts } from "./my-shifts";
import { OpenShifts } from "./open-shifts";

export const metadata: Metadata = { title: "Shifts" };

/** Static shell; each section reads the session and the cached shift list as it streams in. */
export default function ShiftsPage() {
  return (
    <>
      <PageHeader title="Shifts" description="Claim an open shift. You can cancel your own shifts ahead of time." />
      <Suspense fallback={null}>
        <CredentialWarning />
      </Suspense>
      <Section title="Open shifts">
        <Suspense fallback={<ListSkeleton />}>
          <OpenShifts />
        </Suspense>
      </Section>
      <Section title="My shifts">
        <Suspense fallback={<ListSkeleton rows={1} />}>
          <MyShifts />
        </Suspense>
      </Section>
    </>
  );
}

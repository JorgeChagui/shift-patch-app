import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { CredentialList } from "./credential-list";
import { UploadCredentialForm } from "./upload-credential-form";

export const metadata: Metadata = { title: "Credentials" };

export default function CredentialsPage() {
  return (
    <>
      <PageHeader
        title="Credentials"
        description="Your most recent license must be valid on the date of a shift for you to claim it."
      />
      <Section title="Upload a credential">
        <UploadCredentialForm />
      </Section>
      <Section title="Your credentials">
        <Suspense fallback={<TableSkeleton rows={2} />}>
          <CredentialList />
        </Suspense>
      </Section>
    </>
  );
}

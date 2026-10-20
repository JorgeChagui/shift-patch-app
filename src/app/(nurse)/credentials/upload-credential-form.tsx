"use client";

import { useRef } from "react";
import { uploadCredentialAction } from "@/actions/credentials";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { CREDENTIAL_TYPE_LABEL } from "./credential-labels";

export function UploadCredentialForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [, formAction] = useActionFeedback(uploadCredentialAction, () => formRef.current?.reset());

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-2 sm:p-6"
    >
      <Field id="credential-type" label="Type">
        <NativeSelect id="credential-type" name="type" defaultValue="license" className="w-full">
          {Object.entries(CREDENTIAL_TYPE_LABEL).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field id="credential-expiry" label="Expiry date">
        <Input
          id="credential-expiry"
          name="expiresAt"
          type="date"
          required
          data-testid="credential-expiry-date-input"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field id="credential-file" label="File" hint="PDF, JPEG or PNG, up to 4 MB.">
          <Input
            id="credential-file"
            name="file"
            type="file"
            accept=".pdf,image/jpeg,image/png"
            required
            className="h-auto py-1.5"
            data-testid="credential-upload-input"
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>Upload credential</SubmitButton>
      </div>
    </form>
  );
}

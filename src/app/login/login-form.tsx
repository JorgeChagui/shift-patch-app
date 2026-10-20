"use client";

import { Suspense, useState } from "react";
import { loginAction } from "@/actions/auth";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { NextField } from "./next-field";

export function LoginForm() {
  const [, formAction] = useActionFeedback(loginAction);
  // Controlled so a failed attempt keeps the email (React resets uncontrolled fields after an action).
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="grid gap-4">
      <Suspense fallback={null}>
        <NextField />
      </Suspense>
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="login-email-input"
        />
      </Field>
      <Field id="password" label="Password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="login-password-input"
        />
      </Field>
      <SubmitButton size="lg" className="mt-2 w-full" data-testid="login-submit-button">
        Sign in
      </SubmitButton>
    </form>
  );
}

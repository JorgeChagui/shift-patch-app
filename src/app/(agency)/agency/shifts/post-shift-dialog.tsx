"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { createShiftAction } from "@/actions/shifts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { PostShiftFields } from "./post-shift-fields";
import { SubmitButton } from "@/components/forms/submit-button";

/** "Post shift" opens a dialog with the new-shift form; it closes on success. */
export function PostShiftDialog() {
  const [open, setOpen] = useState(false);
  const [, formAction] = useActionFeedback(createShiftAction, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" data-testid="agency-post-shift-button">
          <Plus aria-hidden />
          Post shift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a shift</DialogTitle>
          <DialogDescription>
            Times are facility-local. If it ends at or before it starts, it ends the next day.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <PostShiftFields />
          <SubmitButton size="lg" data-testid="agency-post-shift-submit-button">
            Post shift
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

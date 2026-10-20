"use server";

import { defineAction } from "@/lib/actions";
import { MUTATION_TAGS } from "@/lib/cache-tags";
import { approveTimesheet } from "@/lib/services/timesheets";
import { idParamsSchema } from "@/lib/validation";

export const approveTimesheetAction = defineAction({
  roles: ["agency", "admin"],
  schema: idParamsSchema,
  run: (session, { id }) => approveTimesheet(session, id),
  tags: MUTATION_TAGS.approveTimesheet,
  success: "Timesheet approved",
});

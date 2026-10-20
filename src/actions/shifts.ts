"use server";

import { z } from "zod";
import { defineAction } from "@/lib/actions";
import { MUTATION_TAGS } from "@/lib/cache-tags";
import { cancelShift, claimShift, createShift, withdrawShift } from "@/lib/services/shifts";
import { cancelSchema, idParamsSchema, shiftCreateSchema } from "@/lib/validation";

export const claimShiftAction = defineAction({
  roles: ["nurse"],
  schema: idParamsSchema,
  run: (session, { id }) => claimShift(session, id),
  tags: MUTATION_TAGS.claimShift,
  success: "Shift claimed",
});

/** Nurses (own shift, "advance" only), the owning agency and admins; rules in cancelShift. */
export const cancelShiftAction = defineAction({
  roles: ["nurse", "agency", "admin"],
  schema: z.object({ ...idParamsSchema.shape, ...cancelSchema.shape }),
  run: (session, { id, reason }) => cancelShift(session, id, reason),
  tags: MUTATION_TAGS.cancelShift,
  success: "Shift cancelled",
});

export const createShiftAction = defineAction({
  roles: ["agency"],
  schema: shiftCreateSchema,
  run: (session, input) => createShift(session, input),
  tags: MUTATION_TAGS.createShift,
  success: "Shift posted",
});

export const withdrawShiftAction = defineAction({
  roles: ["agency", "admin"],
  schema: idParamsSchema,
  run: (session, { id }) => withdrawShift(session, id),
  tags: MUTATION_TAGS.withdrawShift,
  success: "Shift withdrawn",
});

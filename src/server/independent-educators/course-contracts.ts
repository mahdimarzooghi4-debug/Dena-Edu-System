import { z } from "zod";

export const newIndependentEducatorCourse = z.object({
  instituteId: z.uuid(),
  clientRequestId: z.uuid(),
  title: z.string().trim().min(5).max(160),
}).strict();

export type NewIndependentEducatorCourse =
  z.infer<typeof newIndependentEducatorCourse>;

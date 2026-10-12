import { z } from "zod";

export const DENA_LEARNING_CONCEPTS = [
  { id: "science.light.v1", label: "علوم · نور و عدسی" },
  { id: "geography.climate.v1", label: "جغرافیا · اقلیم و رطوبت" },
  { id: "math.linear-equation.v1", label: "ریاضی · معادلهٔ یک‌مجهولی" },
  { id: "math.fractions.add.v1", label: "ریاضی · جمع کسرها" },
  { id: "math.percent.v1", label: "ریاضی · درصد" },
] as const;

export const learningConceptIdSchema = z.enum(
  DENA_LEARNING_CONCEPTS.map((concept) => concept.id) as [
    (typeof DENA_LEARNING_CONCEPTS)[number]["id"],
    ...(typeof DENA_LEARNING_CONCEPTS)[number]["id"][],
  ],
);
export type LearningConceptId = (typeof DENA_LEARNING_CONCEPTS)[number]["id"];

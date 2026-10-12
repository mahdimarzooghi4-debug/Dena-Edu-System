import { describe, expect, it } from "vitest";
import { nextStudentCourseAction } from "./next-action";

const id = "00000000-0000-4000-8000-000000000001";
const watch = `/student/courses/${id}/watch`;

describe("next course action is navigation, not measured learning", () => {
  it("prefers the first unmarked video even when approved practice awaits", () => {
    expect(nextStudentCourseAction(id, 3, 1, "not_attempted")).toEqual({
      href: `${watch}#next-unmarked-video`,
      label: "رفتن به نخستین ویدئوی بی‌علامت",
    });
  });

  it("offers approved unanswered practice only after all current markers", () => {
    expect(nextStudentCourseAction(id, 2, 2, "not_attempted")).toEqual({
      href: `${watch}#course-practice-heading`,
      label: "پاسخ به تمرین کوتاه تأییدشده",
    });
  });

  it.each(["not_available", "answered"] as const)(
    "only offers review when practice is %s", (state) => {
      expect(nextStudentCourseAction(id, 2, 2, state)).toEqual({
        href: watch,
        label: "مرور محتوای دوره",
      });
    },
  );
});

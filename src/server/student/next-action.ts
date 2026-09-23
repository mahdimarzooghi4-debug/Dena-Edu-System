/** Navigation hint derived only from a currently entitled student's own
 * self-reported ready-video markers and approved optional practice status.
 * Never interpret the marker as evidence of playback or certification.
 */
export function nextStudentCourseAction(
  courseId: string,
  readyVideos: number,
  markedVideos: number,
  practiceState: "not_available" | "not_attempted" | "answered",
) {
  const watch = `/student/courses/${courseId}/watch`;
  if (markedVideos < readyVideos) {
    return {
      href: `${watch}#next-unmarked-video`,
      label: "رفتن به نخستین ویدئوی بی‌علامت",
    };
  }
  if (practiceState === "not_attempted") {
    return {
      href: `${watch}#course-practice-heading`,
      label: "پاسخ به تمرین کوتاه تأییدشده",
    };
  }
  return { href: watch, label: "مرور محتوای دوره" };
}

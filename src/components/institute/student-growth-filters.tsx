"use client";

import { useRouter } from "next/navigation";

type StudentOption = { studentId: string; name: string };
type CourseOption = { courseId: string; title: string };

export function StudentGrowthFilters({
  students,
  selectedStudentId,
  courses,
  selectedCourseId,
}: {
  students: StudentOption[];
  selectedStudentId: string;
  courses: CourseOption[];
  selectedCourseId: string;
}) {
  const router = useRouter();

  function selectStudent(studentId: string) {
    router.push(studentId
      ? `/institute/learning?studentId=${encodeURIComponent(studentId)}`
      : "/institute/learning");
  }

  function selectCourse(courseId: string) {
    const params = new URLSearchParams({ studentId: selectedStudentId });
    if (courseId) params.set("courseId", courseId);
    router.push(`/institute/learning?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="growth-student">انتخاب دانش‌آموز</label>
      <select id="growth-student" value={selectedStudentId}
        onChange={(event) => selectStudent(event.currentTarget.value)}
        disabled={!students.length}
        className="min-h-11 w-full max-w-[260px] rounded-lg border border-[#e8e6f0] bg-white px-4 text-right text-[13px] text-[#2a254b]">
        {students.length
          ? students.map((student) => <option key={student.studentId} value={student.studentId}>دانش‌آموز: {student.name}</option>)
          : <option value="">دانش‌آموزی برای نمایش موجود نیست</option>}
      </select>

      <label className="sr-only" htmlFor="growth-course">انتخاب دوره</label>
      <select id="growth-course" value={selectedCourseId}
        onChange={(event) => selectCourse(event.currentTarget.value)}
        disabled={!courses.length}
        className="min-h-11 w-full max-w-[260px] rounded-lg border border-[#e8e6f0] bg-white px-4 text-right text-[13px] text-[#2a254b]">
        {courses.length
          ? courses.map((course) => <option key={course.courseId} value={course.courseId}>دوره: {course.title}</option>)
          : <option value="">دوره‌ای برای نمایش موجود نیست</option>}
      </select>
    </div>
  );
}

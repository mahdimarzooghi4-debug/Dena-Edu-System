import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DenaCourseDetailsPage } from "@/components/marketing/dena-course-details";
import { getCatalogCourse } from "@/components/marketing/dena-course-data";

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }): Promise<Metadata> {
  const { courseId } = await params;
  const course = getCatalogCourse(courseId);
  return { title: course ? `${course.title} | دوره‌های دنا` : "دوره یافت نشد | دنا" };
}

export default async function CourseDetailsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = getCatalogCourse(courseId);
  if (!course) notFound();
  return <DenaCourseDetailsPage course={course} />;
}

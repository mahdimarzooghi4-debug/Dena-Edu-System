import type { Metadata } from "next";
import { DenaCourseDetailsPage } from "@/components/marketing/dena-course-details";
export const metadata: Metadata = { title: "جزئیات دوره | دنا" };
export default async function CourseDetailsRoute({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <DenaCourseDetailsPage courseId={courseId} />;
}

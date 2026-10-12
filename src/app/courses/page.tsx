import type { Metadata } from "next";
import { DenaCourseCatalogPage } from "@/components/marketing/dena-public-pages";
export const metadata: Metadata = { title: "دوره‌های آموزشی دنا" };
export default function CoursesPage() { return <DenaCourseCatalogPage />; }

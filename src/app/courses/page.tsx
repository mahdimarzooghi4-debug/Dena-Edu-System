import type { Metadata } from "next";
import { DenaCourseCatalogPage } from "@/components/marketing/dena-public-pages";
import type { DenaCatalogFilters } from "@/components/marketing/dena-catalog-filters";

export const metadata: Metadata = { title: "دوره‌های آموزشی دنا" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<DenaCatalogFilters>;
}) {
  const filters = await searchParams;
  return <DenaCourseCatalogPage filters={filters} />;
}

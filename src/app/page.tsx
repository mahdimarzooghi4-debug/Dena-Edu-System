import type { Metadata } from "next";
import { DenaHomepage } from "@/components/marketing/dena-homepage";

export const metadata: Metadata = {
  title: "دنا | یک مسیر یکپارچه برای رشد تحصیلی",
  description:
    "دوره‌های آموزشی، تمرین، آزمون و همراهی مؤسسه در یک مسیر یکپارچه برای رشد تحصیلی دانش‌آموزان.",
};

export default function HomePage() {
  return <DenaHomepage />;
}

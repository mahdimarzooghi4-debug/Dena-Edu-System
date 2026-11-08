import Link from "next/link";
import type { Metadata } from "next";
import { StudentShell } from "@/components/student/student-shell";
import { VideoConsultationDemo } from "@/components/student-demo/video-consultation-demo";

export const metadata: Metadata = {
  title: "تماس تصویری نمایشی مشاور | دنا",
  description: "نمایش آزمایشی رابط تماس تصویری دنا؛ بدون ارتباط زنده یا دسترسی به دوربین و میکروفن.",
  robots: { index: false, follow: false },
};

export default function StudentDemoVideoConsultationPage() {
  return (
    <StudentShell active="services" title="تماس تصویری با مشاور · نمایشی" demo>
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/student-demo/services" className="inline-flex min-h-10 items-center text-sm font-bold text-dena-brand hover:underline">
          بازگشت به مرکز خدمات
        </Link>
        <VideoConsultationDemo />
      </div>
    </StudentShell>
  );
}

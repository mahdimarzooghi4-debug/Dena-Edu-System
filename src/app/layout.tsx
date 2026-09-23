import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn/wght.css";
import "@fontsource-variable/estedad/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "دنا | دانش‌آموزان نوآفرین ایران",
  description: "بستر فنی آموزش ضبط‌شده، تمرین و آزمون",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only fixed right-4 top-4 z-50 rounded-xl bg-dena-brand px-5 py-3 font-bold text-white focus:not-sr-only"
        >
          رفتن به محتوای اصلی
        </a>
        {children}
      </body>
    </html>
  );
}

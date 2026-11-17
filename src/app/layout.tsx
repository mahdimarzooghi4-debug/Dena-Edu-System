import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn/wght.css";
import "@fontsource-variable/estedad/wght.css";
import "./globals.css";
import { PwaRegistration } from "@/components/pwa/registration";

export const metadata: Metadata = {
  title: "دنا | دانش‌آموزان نوآفرین ایران",
  description: "بستر فنی آموزش ضبط‌شده، تمرین و آزمون",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "دنا", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/app-icons/dena-student-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icons/dena-student-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/app-icons/dena-student-192.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">
        <PwaRegistration />
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

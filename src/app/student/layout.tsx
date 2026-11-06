import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  applicationName: "دنا | اپ دانش‌آموز",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "دنا" },
  icons: { icon: "/dena-app-logo.png", apple: "/dena-app-logo.png" },
};

export default function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

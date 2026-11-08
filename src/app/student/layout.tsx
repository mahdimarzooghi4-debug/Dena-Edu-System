import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  applicationName: "دنا | اپ دانش‌آموز",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/dena-app-logo.png" },
};

export default function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

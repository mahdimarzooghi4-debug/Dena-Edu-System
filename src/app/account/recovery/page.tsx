import type { Metadata } from "next";
import { DenaAuthPage } from "@/components/marketing/dena-auth-pages";

export const metadata: Metadata = { title: "بازیابی حساب | دنا", robots: { index: false, follow: false } };

export default function AccountRecoveryPage() {
  return <DenaAuthPage mode="recovery" />;
}

import type { Metadata } from "next";
import { DenaAuthPage } from "@/components/marketing/dena-auth-pages";

export const metadata: Metadata = { title: "ثبت‌نام | دنا", robots: { index: false, follow: false } };

export default function SignUpPage() {
  return <DenaAuthPage mode="signup" />;
}

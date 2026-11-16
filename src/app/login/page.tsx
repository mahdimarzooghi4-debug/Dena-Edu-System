import type { Metadata } from "next";
import { DenaAuthPage } from "@/components/marketing/dena-auth-pages";

export const metadata: Metadata = {
  title: "ورود و ثبت‌نام | دنا",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <DenaAuthPage mode="login" />;
}

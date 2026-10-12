import type { Metadata } from "next";
import { DenaAccountInfoPage } from "../../components/marketing/dena-public-pages";

export const metadata: Metadata = { title: "ثبت‌نام | دنا", robots: { index: false, follow: false } };

export default function SignUpPage() {
  return <DenaAccountInfoPage mode="signup" />;
}

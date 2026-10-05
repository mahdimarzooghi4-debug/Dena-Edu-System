import type { Metadata } from "next";
import { DenaAccountInfoPage } from "../../../components/marketing/dena-public-pages";

export const metadata: Metadata = { title: "بازیابی حساب | دنا", robots: { index: false, follow: false } };

export default function AccountRecoveryPage() {
  return <DenaAccountInfoPage mode="recovery" />;
}

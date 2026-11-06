import { AdminDirectoryPage, type DirectoryPageProps } from "../../../components/admin/directory-page";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "آمار ثبت دانش‌آموزان سازمانی | مدیریت دنا", robots: { index: false, follow: false } };
export default function Page(props: DirectoryPageProps) {
  return <AdminDirectoryPage section="organization-statistics" {...props} />;
}

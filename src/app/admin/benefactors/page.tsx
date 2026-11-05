import { AdminDirectoryPage, type DirectoryPageProps } from "../../../components/admin/directory-page";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "خیرین و حامیان | مدیریت دنا", robots: { index: false, follow: false } };
export default function Page(props: DirectoryPageProps) {
  return <AdminDirectoryPage section="benefactors" {...props} />;
}

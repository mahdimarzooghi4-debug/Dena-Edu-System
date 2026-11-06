import Link from "next/link";
import { Card } from "../../../../components/ui/card";
import { TicketCreateForm } from "../../../../components/support/ticket-create-form";
import { requireOrganizationAccess } from "../../../../server/organization/require-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "درخواست پشتیبانی سازمان | دنا", robots: { index: false, follow: false } };

export default async function NewOrganizationTicket() {
  await requireOrganizationAccess();
  return (
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Link href="/organization/support" className="text-sm font-bold text-dena-brand">
        بازگشت به پشتیبانی
      </Link>
      <h1 className="text-2xl font-extrabold">درخواست جدید پشتیبانی</h1>
      <Card>
        <TicketCreateForm detailBase="/organization/support" />
      </Card>
    </main>
  );
}

import Link from "next/link";
import { Card } from "../../../../components/ui/card";
import { TicketCreateForm } from "../../../../components/support/ticket-create-form";
import { requireBenefactorAccess } from "../../../../server/benefactor/require-access";

export const dynamic = "force-dynamic";

export default async function NewBenefactorTicket() {
  await requireBenefactorAccess();
  return <main id="main-content" className="space-y-5 p-5 md:p-8">
    <Link href="/benefactor/support" className="text-sm font-bold text-dena-brand">بازگشت به پشتیبانی</Link>
    <h1 className="text-2xl font-extrabold">درخواست جدید</h1>
    <Card><TicketCreateForm detailBase="/benefactor/support" /></Card>
  </main>;
}

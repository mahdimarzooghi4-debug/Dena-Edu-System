import Link from "next/link";
import { Card } from "../ui/card";
import { BenefactorPageHeader } from "./page-header";

export function BenefactorReportState({ title, heading, columns, message }: {
  title: string; heading: string; columns?: string[]; message: string;
}) {
  return <div>
    <BenefactorPageHeader title={title} section="گزارش‌ها" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <Link href="/benefactor/reports" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به گزارش‌ها</Link>
      <Card className="overflow-x-auto">
        <h2 className="mb-4 font-extrabold text-dena-deep">{heading}</h2>
        {columns ? <table className="w-full min-w-[36rem] text-right text-sm">
          <thead className="bg-dena-bg text-dena-muted"><tr>{columns.map((label) =>
            <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody><tr><td colSpan={columns.length} className="px-4 py-6 leading-7 text-dena-muted">{message}</td></tr></tbody>
        </table> : <p className="text-sm leading-7 text-dena-muted">{message}</p>}
      </Card>
    </main>
  </div>;
}

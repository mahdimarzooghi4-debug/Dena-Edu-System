import { randomUUID } from "node:crypto";
import { notFound,redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getCompensationCollaborations,listCompensationDrafts } from "../../../server/provider/compensation";
import { ProviderContractForm } from "../../../components/institute/provider-contract-form";
import { CompensationDrafts } from "../../../components/provider/compensation-drafts";
import { Card } from "../../../components/ui/card";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const metadata={title:"قراردادهای ارائه‌دهندگان | مؤسسه دنا",robots:{index:false,follow:false}};
export default async function ProviderContractsPage() {
  if(!process.env.DATABASE_URL||!process.env.BETTER_AUTH_SECRET||!process.env.BETTER_AUTH_URL) redirect("/login");
  const actor=await getServerAccessContext();
  if(!actor) redirect("/login");
  if(!actor.memberships.some((member)=>member.role==="institute")) notFound();
  const [collaborations,drafts]=await Promise.all([getCompensationCollaborations(actor.userId),listCompensationDrafts(actor.userId,"institute")]);
  return <main id="main-content" className="mx-auto min-h-screen max-w-6xl space-y-6 px-5 py-7 md:px-7"><header className="space-y-3"><p className="text-xs text-dena-muted">مؤسسه / قراردادهای مالی</p><h1 className="text-2xl font-extrabold text-dena-deep">قراردادهای سهم ارائه‌دهندگان</h1><p className="text-sm leading-7 text-dena-muted">شرایط پیشنهادی برای همکاری تأییدشده را ثبت کنید تا طرف مقابل آن را ببیند.</p></header>
    <Card className="space-y-4 rounded-xl p-5"><h2 className="font-extrabold">پیش‌نویس تازه</h2>{!collaborations.length&&<p className="text-sm text-dena-muted">همکاری تأییدشده‌ای برای ثبت قرارداد ندارید.</p>}<ProviderContractForm collaborations={collaborations} requestId={randomUUID()}/></Card><CompensationDrafts drafts={drafts} canActivate/></main>;
}

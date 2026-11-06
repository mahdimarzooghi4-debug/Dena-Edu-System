import { sql } from "drizzle-orm";
import { Card } from "../../../components/ui/card";
import { getDb } from "../../../db";
import { requireBenefactorAccess } from "../../../server/benefactor/require-access";
import { BenefactorContactForm, type Contact } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "پروفایل خیر و حامی | دنا", robots: { index: false, follow: false } };

export default async function BenefactorProfile() {
  const { scopes } = await requireBenefactorAccess();
  const contacts = await getDb().execute<Contact & { benefactor_id: string }>(sql`
    SELECT benefactor_id, phone, email, address, description, revision
    FROM dena_benefactor_contact_profiles WHERE benefactor_id IN ${sql`(${sql.join(scopes.map(({ id }) => sql`${id}`), sql`, `)})`}
  `);
  return <main id="main-content" className="space-y-6 p-5 md:p-8">
    <h1 className="text-2xl font-extrabold text-dena-deep">پروفایل خیر و حامی</h1>
    {scopes.map((scope) => {
      const contact = contacts.find((item) => item.benefactor_id === scope.id)
        ?? { phone: "", email: "", address: "", description: "", revision: -1 };
      return <Card key={scope.id} className="space-y-5">
        <h2 className="text-xl font-extrabold">{scope.name}</h2>
        <p className="text-sm text-dena-muted">عضویت فعال خیر و حامیی</p>
        <BenefactorContactForm key={`${scope.id}:${contact.revision}`} benefactorId={scope.id} contact={contact} />
      </Card>;
    })}
  </main>;
}

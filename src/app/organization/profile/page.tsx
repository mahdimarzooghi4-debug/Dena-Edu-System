import { sql } from "drizzle-orm";
import { Card } from "../../../components/ui/card";
import { getDb } from "../../../db";
import { requireOrganizationAccess } from "../../../server/organization/require-access";
import { OrganizationContactForm, type Contact } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "پروفایل سازمان | دنا", robots: { index: false, follow: false } };

export default async function OrganizationProfile() {
  const { scopes } = await requireOrganizationAccess();
  const contacts = await getDb().execute<Contact & { organization_id: string }>(sql`
    SELECT organization_id, phone, email, address, description, revision
    FROM dena_organization_contact_profiles WHERE organization_id IN ${sql`(${sql.join(scopes.map(({ id }) => sql`${id}`), sql`, `)})`}
  `);
  return <main id="main-content" className="space-y-6 p-5 md:p-8">
    <h1 className="text-2xl font-extrabold text-dena-deep">پروفایل سازمان</h1>
    {scopes.map((scope) => {
      const contact = contacts.find((item) => item.organization_id === scope.id)
        ?? { phone: "", email: "", address: "", description: "", revision: -1 };
      return <Card key={scope.id} className="space-y-5">
        <h2 className="text-xl font-extrabold">{scope.name}</h2>
        <p className="text-sm text-dena-muted">عضویت فعال سازمانی</p>
        <OrganizationContactForm key={`${scope.id}:${contact.revision}`} organizationId={scope.id} contact={contact} />
      </Card>;
    })}
  </main>;
}

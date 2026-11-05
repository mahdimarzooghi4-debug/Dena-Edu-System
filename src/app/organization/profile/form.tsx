"use client";

import { useActionState } from "react";
import { buttonClassName } from "../../../components/ui/button";
import { saveProfile } from "./actions";

export type Contact = { phone: string; email: string; address: string; description: string; revision: number };

export function OrganizationContactForm({ organizationId, contact }: { organizationId: string; contact: Contact }) {
  const [message, action, pending] = useActionState(saveProfile, "");
  return <form action={action} className="space-y-4">
    <input type="hidden" name="organizationId" value={organizationId} />
    <input type="hidden" name="revision" value={contact.revision} />
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
      {[
        ["phone", "شمارهٔ تماس سازمان", "tel"], ["email", "پست الکترونیکی", "email"],
        ["address", "نشانی سازمان", "text"],
      ].map(([key, label, type]) => <label key={key} className="block text-sm font-bold">{label}
        <input name={key} type={type} defaultValue={contact[key as keyof Contact]} maxLength={key === "address" ? 1000 : 254}
          className="mt-2 w-full rounded-xl border border-dena-border px-3 py-2 font-normal" />
      </label>)}
      <label className="text-sm font-bold sm:col-span-2">معرفی سازمان
        <textarea name="description" defaultValue={contact.description} maxLength={4000} rows={4}
          className="mt-2 w-full rounded-xl border border-dena-border px-3 py-2 font-normal" />
      </label>
    </fieldset>
    {message && <p role="status" className="text-sm text-dena-brand">{message}</p>}
    <button disabled={pending} className={buttonClassName()}>{pending ? "در حال ذخیره…" : "ذخیرهٔ اطلاعات"}</button>
  </form>;
}

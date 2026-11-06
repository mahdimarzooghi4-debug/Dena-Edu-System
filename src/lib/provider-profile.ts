import { z } from "zod";
export const providerCategoryLabels = {
  consultation: "مشاوره تحصیلی", content: "تولید محتوای آموزشی",
  learning_support: "پشتیبانی یادگیری", assessment: "آزمون و تحلیل",
} as const;
export const providerContactInput = z.object({
  providerId: z.uuid(), revision: z.coerce.number().int().min(-1),
  brandName: z.string().trim().max(120), phone: z.string().trim().max(40),
  email: z.union([z.email().max(254), z.literal("")]), city: z.string().trim().max(100),
  categories: z.array(z.enum(["consultation","content","learning_support","assessment"])).max(4)
    .transform((values) => [...new Set(values)]),
}).strict();
export type ProviderContact = {
  provider_id: string; name: string; account_name: string; brand_name: string;
  phone: string; email: string; city: string; categories: string[]; revision: number;
};

import Link from "next/link";
export function ProviderSetupProgress({ providerId, saved, hasCategories, hasRequest }: {
  providerId: string; saved: boolean; hasCategories: boolean; hasRequest: boolean;
}) {
  const steps = [
    {label:"حساب کاربری",done:true,href:"/account"},
    {label:"هویت و برند",done:saved,href:`#provider-profile-${providerId}`},
    {label:"دسته خدمات",done:hasCategories,href:`#provider-categories-${providerId}`},
    {label:"انتخاب مؤسسه",done:hasRequest,href:"/provider/collaborations"},
    {label:"ارسال درخواست",done:hasRequest,href:"/provider/collaborations"},
  ];
  const current = steps.findIndex((step) => !step.done);
  return <ol aria-label="مراحل آماده‌سازی ارائه‌دهنده" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
    {steps.map((step,index) => <li key={step.label}><Link href={step.href} aria-current={index === current ? "step" : undefined}
      className={`block h-full rounded-lg border p-2.5 text-xs ${index===current ? "border-dena-brand bg-dena-lavender" : step.done ? "border-dena-brand/30 bg-white" : "border-dena-border bg-dena-bg"}`}>
      <span className="block font-extrabold text-dena-brand">{(index+1).toLocaleString("fa-IR",{minimumIntegerDigits:2})}</span>
      <span className="mt-1 block text-dena-ink">{step.label}</span>
      <span className="mt-2 block text-[10px] text-dena-muted">{step.done ? "انجام‌شده" : index===current ? "قدم بعدی" : "در پیش رو"}</span>
    </Link></li>)}
  </ol>;
}

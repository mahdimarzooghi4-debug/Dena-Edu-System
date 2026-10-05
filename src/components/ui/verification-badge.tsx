export function VerificationBadge({ kind }: {
  kind: "institute" | "provider" | "independent-educator";
}) {
  const isInstitute = kind === "institute";
  const isIndependent = kind === "independent-educator";
  const label = isInstitute ? "مؤسسهٔ تأییدشده در دنا"
    : isIndependent ? "همکار مستقل" : "ارائه‌دهندهٔ تحت همکاری تأییدشده";
  return <span title={isInstitute
    ? "هویت این مؤسسه در دنا تأیید شده است؛ این نشان مجوز رسمی آموزشی نیست."
    : isIndependent ? "این مدرس با نام خود و زیر نظارت مؤسسه فعالیت می‌کند؛ این نشان مجوز رسمی آموزشی نیست."
      : "همکاری این ارائه‌دهنده با مؤسسه و دنا تأیید شده است."
  } className={
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold " +
    (isInstitute ? "bg-blue-50 text-blue-800" : "bg-orange-50 text-orange-800")
  }>
    <span aria-hidden="true" className={
      "grid size-4 place-items-center rounded-full text-[10px] text-white " +
      (isInstitute ? "bg-blue-600" : "bg-orange-600")
    }>✓</span>
    {label}
  </span>;
}

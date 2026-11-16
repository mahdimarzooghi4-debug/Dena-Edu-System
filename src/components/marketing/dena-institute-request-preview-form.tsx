"use client";

import { useRouter } from "next/navigation";

export function DenaInstituteRequestPreviewForm() {
  const router = useRouter();

  function previewSuccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Figma specifies this as a design-only flow. No form values leave the browser.
    router.push("/institutes/request/confirmation");
  }

  return (
    <form className="dena-next__request-form" onSubmit={previewSuccess}>
      <div className="dena-next__form-heading">
        <h2>اطلاعات مؤسسه و نماینده</h2>
        <p>موارد ستاره‌دار برای ثبت درخواست اولیه لازم‌اند؛ سایر اطلاعات را می‌توان بعداً تکمیل کرد.</p>
      </div>
      <div className="dena-next__fields">
        <label>نام مؤسسه *<input name="institution" required placeholder="نام رسمی مؤسسه آموزشی" /></label>
        <label>شماره مجوز (اختیاری)<input name="license" placeholder="در صورت دسترسی، شماره مجوز" /></label>
        <label>نام و نام خانوادگی نماینده *<input name="representative" required placeholder="نام نماینده مؤسسه" /></label>
        <label>سمت نماینده (اختیاری)<input name="position" placeholder="برای نمونه: مدیر یا مسئول آموزش" /></label>
        <label>شماره تماس نماینده *<input name="phone" type="tel" required placeholder="شماره همراه یا تماس قابل دسترس" /></label>
        <label>ایمیل کاری (اختیاری)<input name="email" type="email" placeholder="ایمیل کاری مؤسسه" /></label>
        <label>نشانی وب‌سایت (اختیاری)<input name="website" type="url" placeholder="نشانی وب‌سایت مؤسسه" /></label>
        <label>حوزه‌های آموزشی (اختیاری)<input name="subjects" placeholder="پایه‌ها و درس‌های موردنظر" /></label>
        <label className="dena-next__field--wide">درباره دوره‌ها و همکاری موردنظر (اختیاری)<textarea name="details" rows={4} placeholder="اگر نکته‌ای درباره دوره‌های ضبط‌شده یا نوع همکاری مدنظر دارید، اینجا بنویسید." /></label>
      </div>
      <p className="dena-next__privacy-copy">در نسخهٔ فعال، اطلاعات درج‌شده برای بررسی اولیه همکاری و ارتباط با نماینده مؤسسه در اختیار دنا قرار می‌گیرد.</p>
      <p className="dena-next__preview-note">پیش‌نمایش طراحی در Figma؛ ارسال واقعی پس از پیاده‌سازی فعال می‌شود. اطلاعات این فرم ارسال یا ذخیره نمی‌شوند.</p>
      <div className="dena-next__form-actions">
        <span>ثبت درخواست، به‌معنای تأیید همکاری یا ایجاد حساب مؤسسه نیست.</span>
        <button className="dena-next__button dena-next__button--primary" type="submit">ارسال درخواست همکاری</button>
      </div>
    </form>
  );
}

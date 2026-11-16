"use client";

import Link from "next/link";

export function DenaInstituteRequestPreviewForm() {
  return (
    <div className="dena-next__request-form" role="group" aria-label="پیش‌نمایش اطلاعات درخواست مؤسسه">
      <div className="dena-next__form-heading">
        <h2>اطلاعات مؤسسه و نماینده</h2>
        <p>موارد ستاره‌دار برای ثبت درخواست اولیه لازم‌اند؛ سایر اطلاعات را می‌توان بعداً تکمیل کرد.</p>
      </div>
      <div className="dena-next__fields">
        <label>نام مؤسسه *<input readOnly placeholder="نام رسمی مؤسسه آموزشی" /></label>
        <label>شماره مجوز (اختیاری)<input readOnly placeholder="در صورت دسترسی، شماره مجوز" /></label>
        <label>نام و نام خانوادگی نماینده *<input readOnly placeholder="نام نماینده مؤسسه" /></label>
        <label>سمت نماینده (اختیاری)<input readOnly placeholder="برای نمونه: مدیر یا مسئول آموزش" /></label>
        <label>شماره تماس نماینده *<input readOnly type="tel" placeholder="شماره همراه یا تماس قابل دسترس" /></label>
        <label>ایمیل کاری (اختیاری)<input readOnly type="email" placeholder="ایمیل کاری مؤسسه" /></label>
        <label>نشانی وب‌سایت (اختیاری)<input readOnly type="url" placeholder="نشانی وب‌سایت مؤسسه" /></label>
        <label>حوزه‌های آموزشی (اختیاری)<input readOnly placeholder="پایه‌ها و درس‌های موردنظر" /></label>
        <label className="dena-next__field--wide">درباره دوره‌ها و همکاری موردنظر (اختیاری)<textarea readOnly rows={4} placeholder="اگر نکته‌ای درباره دوره‌های ضبط‌شده یا نوع همکاری مدنظر دارید، اینجا بنویسید." /></label>
      </div>
      <p className="dena-next__privacy-copy">در نسخهٔ فعال، اطلاعات درج‌شده برای بررسی اولیه همکاری و ارتباط با نماینده مؤسسه در اختیار دنا قرار می‌گیرد.</p>
      <p className="dena-next__preview-note">این فرم پیش‌نمایش طراحی است و اطلاعات آن ارسال یا ذخیره نمی‌شوند. برای ثبت درخواست واقعی از مسیر امن حساب کاربری اقدام کنید.</p>
      <div className="dena-next__form-actions">
        <span>ثبت درخواست، به‌معنای تأیید همکاری یا ایجاد حساب مؤسسه نیست.</span>
        <Link className="dena-next__button dena-next__button--primary" href="/login?next=%2Faccount%2Frole-applications">ورود و ثبت درخواست مؤسسه</Link>
      </div>
    </div>
  );
}

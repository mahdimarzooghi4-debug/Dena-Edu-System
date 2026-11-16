/** Versioned illustrative catalogue content for the public Dena showcase.
 *  No live enrollment, verified teacher or price claim is made by these fixtures.
 */
export const catalogCourses = [
  { id:"chemistry-tenth", subject:"chemistry", title:"شیمی دهم (کیهان و ساختار)", provider:"مؤسسه کنکور برتر", teacher:"استاد مریم سهرابی", sessions:"۲۸ جلسه", hours:"۲۲ ساعت محتوای آموزشی", price:"۴,۱۰۰,۰۰۰ تومان", priceValue:4100000, supervised:false, installment:true, image:"chemistry", cover:"/images/dena-course-covers/chemistry.webp" },
  { id:"physics-tenth", subject:"physics", title:"فیزیک دهم (مکانیک)", provider:"گروه ماز", teacher:"دکتر رضا علوی", supervisor:"مؤسسه آموزشی البرز", sessions:"۲۰ جلسه", hours:"۱۵ ساعت محتوای آموزشی", price:"۳,۲۰۰,۰۰۰ تومان", priceValue:3200000, supervised:true, installment:true, image:"physics", cover:"/images/dena-course-covers/physics.webp" },
  { id:"math-tenth", subject:"math", title:"ریاضی دهم تجربی و ریاضی", provider:"مؤسسه آموزشی نمونه", teacher:"استاد علیرضا احمدی", sessions:"۲۴ جلسه", hours:"۱۸ ساعت محتوای آموزشی", price:"۳,۸۰۰,۰۰۰ تومان", priceValue:3800000, supervised:false, installment:true, image:"math", cover:"/images/dena-course-covers/math.webp" },
  { id:"biology-tenth", subject:"biology", title:"زیست‌شناسی دهم (پایه و مفاهیم)", provider:"آکادمی علوم فردا", teacher:"دکتر سارا حسینی", sessions:"۳۲ جلسه", hours:"۲۶ ساعت محتوای آموزشی", price:"۴,۵۰۰,۰۰۰ تومان", priceValue:4500000, supervised:false, installment:false, image:"biology", cover:"/images/dena-course-covers/biology.webp" },
  { id:"arabic-tenth", subject:"arabic", title:"عربی دهم (ترجمه و قواعد)", provider:"گروه آموزشی مبین", teacher:"استاد محمد کریمی", supervisor:"آموزشگاه اندیشه", sessions:"۱۶ جلسه", hours:"۱۲ ساعت محتوای آموزشی", price:"۱,۹۰۰,۰۰۰ تومان", priceValue:1900000, supervised:true, installment:true, image:"arabic", cover:"/images/dena-course-covers/arabic.webp" },
  { id:"literature-tenth", subject:"literature", title:"ادبیات فارسی دهم (آرایه‌ها و قرابت)", provider:"مؤسسه فرهنگ و ادب", teacher:"دکتر حسن رضایی", sessions:"۱۸ جلسه", hours:"۱۴ ساعت محتوای آموزشی", price:"۲,۱۰۰,۰۰۰ تومان", priceValue:2100000, supervised:false, installment:false, image:"literature", cover:"/images/dena-course-covers/literature.webp" },
] as const;
export type CatalogCourse = (typeof catalogCourses)[number];
export function getCatalogCourse(id: string) {
  return catalogCourses.find((item) => item.id === id);
}

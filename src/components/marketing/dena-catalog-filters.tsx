"use client";

import Image from "next/image";
import Link from "next/link";

export type DenaCatalogFilters = {
  q?: string;
  grade?: string;
  subject?: string;
  provider?: string;
  price?: string;
};

/** GET-only filters for sample course cards; no server-side commerce actions. */
export function DenaCatalogFilterBar({ filters }: { filters: DenaCatalogFilters }) {
  return (
    <form key={JSON.stringify(filters)} className="dena-catalog-filters" method="get" action="/courses"
      role="search" aria-label="جست‌وجو و پالایش دوره‌های نمایشی"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      <div className="dena-catalog-filters__search">
        <label className="sr-only" htmlFor="dena-catalog-query">نام درس، دوره یا ارائه‌دهنده</label>
        <input id="dena-catalog-query" type="search" name="q"
          defaultValue={filters.q ?? ""}
          placeholder="نام درس، دوره یا ارائه‌دهنده را جست‌وجو کن" />
        <button type="submit" aria-label="جست‌وجو در دوره‌های نمایشی">
          <Image alt="" src="/figma/dena-catalog/search.svg" width={20} height={20} />
        </button>
      </div>
      <div className="dena-catalog-filters__row">
        <div className="dena-catalog-filters__selects">
          <label className="dena-catalog-filters__select">
            <span className="sr-only">پایه تحصیلی</span>
            <select name="grade" defaultValue={filters.grade ?? ""} aria-label="پایه تحصیلی">
              <option value="">پایه تحصیلی</option>
              <option value="10">دهم</option>
              <option value="11">یازدهم</option>
              <option value="12">دوازدهم</option>
            </select>
            <Image aria-hidden="true" alt="" src="/figma/dena-catalog/chevron-down.svg" width={12} height={12} />
          </label>
          <label className="dena-catalog-filters__select">
            <span className="sr-only">درس</span>
            <select name="subject" defaultValue={filters.subject ?? ""} aria-label="درس">
              <option value="">درس</option>
              <option value="math">ریاضی</option>
              <option value="physics">فیزیک</option>
              <option value="chemistry">شیمی</option>
              <option value="biology">زیست‌شناسی</option>
              <option value="arabic">عربی</option>
              <option value="literature">ادبیات فارسی</option>
            </select>
            <Image aria-hidden="true" alt="" src="/figma/dena-catalog/chevron-down.svg" width={12} height={12} />
          </label>
          <label className="dena-catalog-filters__select">
            <span className="sr-only">وضعیت ارائه‌دهنده</span>
            <select name="provider" defaultValue={filters.provider ?? ""} aria-label="وضعیت ارائه‌دهنده">
              <option value="">وضعیت ارائه‌دهنده</option>
              <option value="licensed">مؤسسه دارای مجوز</option>
              <option value="supervised">ارائه‌دهنده تحت نظارت</option>
            </select>
            <Image aria-hidden="true" alt="" src="/figma/dena-catalog/chevron-down.svg" width={12} height={12} />
          </label>
          <label className="dena-catalog-filters__select">
            <span className="sr-only">محدوده قیمت</span>
            <select name="price" defaultValue={filters.price ?? ""} aria-label="محدوده قیمت">
              <option value="">محدوده قیمت</option>
              <option value="under3">کمتر از ۳ میلیون تومان</option>
              <option value="3to5">۳ تا ۵ میلیون تومان</option>
            </select>
            <Image aria-hidden="true" alt="" src="/figma/dena-catalog/chevron-down.svg" width={12} height={12} />
          </label>
        </div>
        <Link className="dena-catalog-filters__clear" href="/courses">پاک‌کردن فیلترها</Link>
      </div>
    </form>
  );
}

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { CourseSupervisionRequest } from "./course-supervision-request";
const providerId="00000000-0000-4000-8000-000000000001";
const instituteId="00000000-0000-4000-8000-000000000002";
test("course requests present provider and institute names instead of requiring technical identifiers", () => {
  const html=renderToStaticMarkup(createElement(CourseSupervisionRequest,{
    providerIds:[providerId],providers:[{id:providerId,name:"ارائه‌دهندهٔ آزمون"}],
    institutes:[{id:instituteId,name:"مؤسسهٔ آزمون"}],
  }));
  expect(html).toContain("ارائه‌دهندهٔ آزمون");
  expect(html).toContain("مؤسسهٔ آزمون");
  expect(html).not.toContain("UUID اعلام‌شده");
  expect(html).toContain("در حال دریافت دوره‌ها");
  expect(html).not.toContain("درخواست دوره‌ای ثبت نشده است");
});
test("an empty institute directory explains why course submission is unavailable", () => {
  const html=renderToStaticMarkup(createElement(CourseSupervisionRequest,{
    providerIds:[providerId],providers:[{id:providerId,name:"Provider"}],institutes:[],
  }));
  expect(html).toContain("مؤسسهٔ ناظر فعالی برای انتخاب وجود ندارد");
  expect(html).toContain("disabled");
});

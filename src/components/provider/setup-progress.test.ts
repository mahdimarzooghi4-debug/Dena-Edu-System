import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,test } from "vitest";
import { ProviderSetupProgress } from "./setup-progress";
test("setup highlights the first unfinished step without marking submitted requests approved",()=>{
  const first=renderToStaticMarkup(createElement(ProviderSetupProgress,{providerId:"scope",saved:false,hasCategories:false,hasRequest:false}));
  expect(first.match(/aria-current="step"/g)).toHaveLength(1);
  expect(first).toContain("#provider-profile-scope");
  const submitted=renderToStaticMarkup(createElement(ProviderSetupProgress,{providerId:"scope",saved:true,hasCategories:true,hasRequest:true}));
  expect(submitted).not.toContain('aria-current="step"');
  expect(submitted).not.toContain("تأیید نهایی");
});

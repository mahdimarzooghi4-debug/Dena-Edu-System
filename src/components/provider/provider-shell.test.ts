import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ProviderShell } from "./provider-shell";
const location = vi.hoisted(() => ({ path: "/provider/profile" }));
vi.mock("next/navigation", () => ({ usePathname: () => location.path }));
vi.mock("../auth/sign-out-button", () => ({ SignOutButton: () => createElement("button", null, "خروج از حساب") }));
const render = () => renderToStaticMarkup(ProviderShell({ children: createElement("p", null, "Content") }));
test("provider desktop and mobile shells expose profile, collaboration, support and sign out", () => {
  location.path = "/provider/profile";
  const html = render();
  expect(html.match(/aria-current="page"/g)).toHaveLength(2);
  for (const href of ["/provider/profile", "/provider/collaborations", "/support"]) {
    expect(html.split('href="' + href + '"').length - 1).toBe(2);
  }
  expect(html.match(/خروج از حساب/g)).toHaveLength(2);
  expect(html).toContain("/provider-nav/indicator-active.svg");
});
test("nested course routes select courses without also selecting dashboard", () => {
  location.path = "/provider/courses/course-id/media";
  expect(render().match(/aria-current="page"/g)).toHaveLength(2);
});

import { createElement } from "react";
import { expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminShell } from "./admin-shell";
import { adminDirectories } from "../../server/admin/directory";

vi.mock("../auth/sign-out-button", () => ({ SignOutButton: () => createElement("button", null, "خروج از حساب") }));

test("desktop and mobile menus expose every new directory and mark the active page", () => {
  const html = renderToStaticMarkup(AdminShell({ active: "institutes", children: createElement("p", null, "Content") }));
  for (const section of Object.keys(adminDirectories)) {
    expect(html.split('href="' + "/admin/" + section + '"').length - 1, section).toBe(2);
  }
  expect(html.match(/aria-current="page"/g)).toHaveLength(2);
  expect(html).not.toContain('href="/admin/support"');
  expect(html).toContain("max-h-[65dvh]");
  expect(html).toContain("overflow-y-auto");
});

test("technical support appears only for an authorized operator", () => {
  const html = renderToStaticMarkup(AdminShell({ active: "support", canHandleSupport: true, children: createElement("p", null, "Content") }));
  expect(html.split('href="/admin/support"').length - 1).toBe(2);
  expect(html.match(/aria-current="page"/g)).toHaveLength(2);
  expect(html).toContain('href="/admin/settings"');
});

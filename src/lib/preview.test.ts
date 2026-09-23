import { describe, expect, it } from "vitest";
import { navigation, roles } from "./navigation";
import { previewHref, roleLabels } from "./preview";

describe("public previews are separate from live role routes", () => {
  it("maps every approved route under /preview without publishing a role route", () => {
    for (const role of roles) {
      expect(roleLabels[role]).toBeTruthy();
      for (const route of navigation[role]) {
        expect(previewHref(role, route.href)).toBe("/preview" + route.href);
      }
    }
  });

  it("rejects cross-role preview hrefs", () => {
    expect(() => previewHref("student", "/admin")).toThrow();
    expect(() => previewHref("student", "/student-ish")).toThrow();
  });
});

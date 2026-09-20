import { describe, expect, it } from "vitest";
import { figmaUrl, navigation, roles, sharedTechnicalSupport } from "./navigation";

describe("approved Dena design map", () => {
  it("contains six role route sets with no duplicate URL", () => {
    const hrefs = roles.flatMap((role) => navigation[role].map((route) => route.href));
    expect(roles).toHaveLength(6);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).not.toContain(sharedTechnicalSupport.href);
  });

  it("keeps one front-office support and a separate operator view", () => {
    expect(sharedTechnicalSupport.href).toBe("/support");
    expect(navigation.admin.some((r) => r.href === "/admin/support")).toBe(true);
    expect(figmaUrl(sharedTechnicalSupport.figmaNode)).toContain("node-id=206-54");
  });
});

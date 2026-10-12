import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
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

  it("has an App Router page for every mapped role route", () => {
    const missingRoutes = roles.flatMap((role) => navigation[role]
      .filter(({ href }) => !existsSync(resolve(
        process.cwd(), "src/app", href.slice(1), "page.tsx",
      )))
      .map(({ href }) => href));

    expect(missingRoutes).toEqual([]);
  });

  it("keeps every literal internal page link pointed at an App Router page", () => {
    const sourceFiles = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(entryPath);
        return entry.isFile() && entry.name.endsWith(".tsx") ? [entryPath] : [];
      });
    const appRoot = resolve(process.cwd(), "src/app");
    const routes = sourceFiles(appRoot)
      .filter((file) => file.split(sep).at(-1) === "page.tsx")
      .map((file) => {
        const routeParts = relative(appRoot, file).split(sep).slice(0, -1);
        return routeParts.length ? `/${routeParts.join("/")}` : "/";
      });
    const internalHref = /\bhref\s*=\s*\{?\s*(?:"(\/[^\"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g;
    const links = sourceFiles(resolve(process.cwd(), "src")).flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return [...content.matchAll(internalHref)].flatMap((match) => {
        const href = (match[1] ?? match[2] ?? match[3] ?? "")
          .replace(/\$\{[^}]+\}/g, "sample-id")
          .split(/[?#]/, 1)[0]!;
        return href && !href.startsWith("/api/") ? [{ file, href }] : [];
      });
    });
    const hasPage = (href: string) => {
      const hrefParts = href === "/" ? [] : href.slice(1).split("/");
      return routes.some((route) => {
        const routeParts = route === "/" ? [] : route.slice(1).split("/");
        let index = 0;
        for (; index < routeParts.length; index += 1) {
          const part = routeParts[index]!;
          if (part.startsWith("[[...") && part.endsWith("]]")) return true;
          if (part.startsWith("[...") && part.endsWith("]")) {
            return hrefParts.length > index;
          }
          if (hrefParts[index] === undefined) return false;
          if (part.startsWith("[") && part.endsWith("]")) continue;
          if (hrefParts[index] !== part) return false;
        }
        return hrefParts.length === routeParts.length;
      });
    };

    expect(links.filter(({ href }) => !hasPage(href))).toEqual([]);
  });
});

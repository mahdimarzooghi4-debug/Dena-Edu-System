import { describe, expect, it } from "vitest";
import {
  escapeCatalogSearch, InvalidCourseCatalogQuery, readCatalogQuery,
} from "./course-catalog";

const validCursor = (values: object) =>
  Buffer.from(JSON.stringify(values)).toString("base64url");

describe("student course catalog query and cursor boundary", () => {
  it("allows the empty catalog query, normalizes terms and matches its cursor", () => {
    expect(readCatalogQuery(new URLSearchParams())).toEqual({
      q: "", mine: false, cursor: null,
    });
    const cursor = validCursor({
      title: "عنوان دوره", id: "0d24c530-ef1d-4518-b640-af1524219521",
      q: "ریاضی", mine: true,
    });
    const parsed = readCatalogQuery(new URLSearchParams({
      q: "  ریاضی  ", mine: "1", cursor,
    }));
    expect(parsed.cursor?.title).toBe("عنوان دوره");
    expect(parsed.cursor?.mine).toBe(true);
    expect(parsed.q).toBe("ریاضی");
  });

  it("does not allow wildcard injection into ILIKE substring search", () => {
    expect(escapeCatalogSearch("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
    expect(escapeCatalogSearch("ریاضی")).toBe("ریاضی");
  });

  it("rejects invalid filters, oversized terms, controls and duplicates", () => {
    for (const text of [
      "mine=0", "mine=true", "q=" + "x".repeat(81),
      "q=" + encodeURIComponent("a\n"),
      "q=abc&q=xyz", "cursor=not_base64!", "cursor=" + "a".repeat(641),
    ]) {
      expect(() => readCatalogQuery(new URLSearchParams(text)))
        .toThrow(InvalidCourseCatalogQuery);
    }
  });

  it("does not reuse a cursor for another student catalog filter", () => {
    const cursor = validCursor({
      title: "آموزش", id: "0d24c530-ef1d-4518-b640-af1524219521",
      q: "ریاضی", mine: false,
    });
    for (const search of [
      new URLSearchParams({ q: "فیزیک", cursor }),
      new URLSearchParams({ q: "ریاضی", mine: "1", cursor }),
    ]) {
      expect(() => readCatalogQuery(search)).toThrow(InvalidCourseCatalogQuery);
    }
  });

  it("rejects malformed and forged cursor structure", () => {
    for (const value of [
      {}, { title: "عنوان", id: "wrong", q: "", mine: false },
      { title: "عنوان", id: "0d24c530-ef1d-4518-b640-af1524219521",
        q: "", mine: false, userId: "injected" },
      ["عنوان", "0d24c530-ef1d-4518-b640-af1524219521"],
    ]) {
      expect(() => readCatalogQuery(new URLSearchParams({
        cursor: validCursor(value),
      }))).toThrow(InvalidCourseCatalogQuery);
    }
  });
});

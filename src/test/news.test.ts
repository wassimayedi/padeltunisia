import { describe, expect, it } from "vitest";
import { newsDate } from "@/lib/news";

describe("newsDate", () => {
  it("formats an exact date", () => {
    expect(newsDate({ publishedOn: "2026-10-23", dateApproximate: false })).toBe("23 oct. 2026");
  });
  it("flags an approximate date", () => {
    expect(newsDate({ publishedOn: "2026-10-17", dateApproximate: true })).toBe("vers le 17 oct. 2026");
  });
});

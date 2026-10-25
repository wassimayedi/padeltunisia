import { describe, expect, it } from "vitest";
import { articleDate, readingMinutes } from "@/lib/magazine";

describe("magazine helpers", () => {
  it("estimates reading time at about 200 words a minute", () => {
    expect(readingMinutes("mot ".repeat(400))).toBe(2);
    expect(readingMinutes("court")).toBe(1);
  });
  it("formats the publication date in full", () => {
    expect(articleDate("2026-10-24")).toBe("24 octobre 2026");
  });
});

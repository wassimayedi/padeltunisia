import { describe, expect, it } from "vitest";
import { dateRange, dateRangeLong, eventPlace } from "@/lib/events";

describe("dateRange", () => {
  it("shortens a range within one month", () => {
    expect(dateRange("2026-10-19", "2026-10-25")).toBe("19–25 oct. 2026");
  });
  it("keeps both months across a month boundary", () => {
    expect(dateRange("2026-10-30", "2026-11-01")).toBe("30 oct.–1 nov. 2026");
  });
  it("shows a single day once", () => {
    expect(dateRange("2026-12-03", "2026-12-03")).toBe("3 déc. 2026");
  });
});

describe("eventPlace", () => {
  const base = { venue: "Melilla", country: "Espagne", scope: "int" as const, club: null };
  it("adds the country abroad", () => {
    expect(eventPlace(base)).toBe("Melilla, Espagne");
  });
  it("uses the club name for Tunisian events", () => {
    expect(eventPlace({ ...base, scope: "tn", venue: "Padel House Tunisia", club: { slug: "padel-house", name: "Padel House" } })).toBe("Padel House");
  });
  it("handles an unannounced venue", () => {
    expect(eventPlace({ ...base, venue: null, country: null })).toBe("Lieu à confirmer");
  });
});

describe("dateRangeLong", () => {
  it("spells out a range in one month", () => {
    expect(dateRangeLong("2026-10-19", "2026-10-25")).toBe("du 19 au 25 octobre 2026");
  });
  it("uses 1er when a range starts on the first", () => {
    expect(dateRangeLong("2026-11-01", "2026-11-03")).toBe("du 1er au 3 novembre 2026");
  });
  it("uses 1er across months", () => {
    expect(dateRangeLong("2026-10-30", "2026-11-01")).toBe("du 30 octobre au 1er novembre 2026");
  });
});

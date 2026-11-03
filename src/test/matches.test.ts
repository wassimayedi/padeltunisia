import { describe, expect, it } from "vitest";
import {
  createMatchSchema,
  dateWindow,
  genderAllowed,
  levelInRange,
  overlaps,
  rangeAllowedFor,
  safeNextPath,
  spotsLeft,
  tunisDate,
  tunisInstant,
  whatsappLink,
  withProfileDefaults,
} from "@/lib/matches";
import { messageFor } from "@/server/notify";

describe("level range", () => {
  it("lets in players within the range, bounds included", () => {
    const m = { levelMin: 3, levelMax: 5 };
    expect([2, 3, 4, 5, 6].map((l) => levelInRange(l, m))).toEqual([false, true, true, true, false]);
  });

  it("keeps a creator's range within one level of their own", () => {
    expect(rangeAllowedFor(4, { levelMin: 3, levelMax: 5 })).toBe(true);
    expect(rangeAllowedFor(4, { levelMin: 4, levelMax: 4 })).toBe(true);
    expect(rangeAllowedFor(4, { levelMin: 4, levelMax: 8 })).toBe(false);
    expect(rangeAllowedFor(4, { levelMin: 2, levelMax: 4 })).toBe(false);
    expect(rangeAllowedFor(4, { levelMin: 5, levelMax: 6 })).toBe(false);
  });

  it("rejects a minimum above the maximum", () => {
    const base = { clubSlug: "x", date: "2026-11-10", start: "19:00", durationMin: 90, gender: "mixed", spots: 3, courtBooked: false };
    expect(createMatchSchema.safeParse({ ...base, levelMin: 5, levelMax: 3 }).success).toBe(false);
    expect(createMatchSchema.safeParse({ ...base, levelMin: 3, levelMax: 5 }).success).toBe(true);
  });
});

describe("gender", () => {
  it("allows mixed matches to everyone and others to their gender", () => {
    expect(genderAllowed("female", "mixed")).toBe(true);
    expect(genderAllowed("male", "male")).toBe(true);
    expect(genderAllowed("female", "male")).toBe(false);
  });
});

describe("search defaults", () => {
  const viewer = { city: "Sousse", level: 4, gender: "female" as const };
  const base = { date: "" as const, page: 1 };

  it("fills the filters left out from the profile", () => {
    expect(withProfileDefaults(base, viewer)).toMatchObject({ city: "Sousse", level: 4, gender: "female" });
  });

  it("keeps an explicit choice, including all", () => {
    expect(withProfileDefaults({ ...base, city: "", level: 0, gender: "mixed" }, viewer)).toMatchObject({ city: "", level: 0, gender: "mixed" });
  });

  it("shows everything to visitors and incomplete profiles", () => {
    expect(withProfileDefaults(base, null)).toMatchObject({ city: "", level: 0, gender: "" });
    expect(withProfileDefaults(base, { city: null, level: null, gender: null })).toMatchObject({ city: "", level: 0, gender: "" });
  });
});

describe("overlap", () => {
  const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 10, h, m));
  it("detects slots that share time, not back-to-back ones", () => {
    expect(overlaps({ startsAt: at(18), endsAt: at(19, 30) }, { startsAt: at(19), endsAt: at(20, 30) })).toBe(true);
    expect(overlaps({ startsAt: at(18), endsAt: at(19, 30) }, { startsAt: at(19, 30), endsAt: at(21) })).toBe(false);
  });
});

describe("Tunis time (UTC+1)", () => {
  it("converts a local date and time to the UTC instant", () => {
    expect(tunisInstant("2026-11-10", "19:00").toISOString()).toBe("2026-11-10T18:00:00.000Z");
  });

  it("puts 23:30 UTC on the next Tunis day", () => {
    expect(tunisDate(new Date("2026-11-10T23:30:00Z"))).toBe("2026-11-11");
  });

  it("builds today, tomorrow and weekend windows in Tunis days", () => {
    const tuesday = new Date("2026-11-10T10:00:00Z");
    expect(dateWindow("today", tuesday)).toEqual({ from: new Date("2026-11-09T23:00:00Z"), to: new Date("2026-11-10T23:00:00Z") });
    expect(dateWindow("tomorrow", tuesday)?.from).toEqual(new Date("2026-11-10T23:00:00Z"));
    expect(dateWindow("weekend", tuesday)).toEqual({ from: new Date("2026-11-13T23:00:00Z"), to: new Date("2026-11-15T23:00:00Z") });
    // On Sunday only what's left of the day.
    expect(dateWindow("weekend", new Date("2026-11-15T10:00:00Z"))).toEqual({ from: new Date("2026-11-14T23:00:00Z"), to: new Date("2026-11-15T23:00:00Z") });
    expect(dateWindow("", tuesday)).toBeNull();
    expect(dateWindow("2026-11-20", tuesday)).toEqual({ from: new Date("2026-11-19T23:00:00Z"), to: new Date("2026-11-20T23:00:00Z") });
  });
});

describe("helpers", () => {
  it("counts spots left", () => {
    expect(spotsLeft({ spots: 3, accepted: 1 })).toBe(2);
    expect(spotsLeft({ spots: 1, accepted: 2 })).toBe(0);
  });

  it("only redirects to same-site paths after login", () => {
    expect(safeNextPath("/matchs/abc?join=1")).toBe("/matchs/abc?join=1");
    expect(safeNextPath("//evil.example")).toBe("/matchs");
    expect(safeNextPath("/\\evil.example")).toBe("/matchs");
    expect(safeNextPath("https://evil.example")).toBe("/matchs");
    expect(safeNextPath(null)).toBe("/matchs");
  });

  it("builds wa.me links without the leading zero", () => {
    expect(whatsappLink("216", "22 123 456")).toBe("https://wa.me/21622123456");
    expect(whatsappLink("33", "0612345678")).toBe("https://wa.me/33612345678");
  });

  it("writes notification messages with the match link", () => {
    const msg = messageFor("request_accepted", { id: "abc", startsAt: new Date("2026-11-10T18:00:00Z"), clubName: "Padel Club", city: "Tunis" });
    expect(msg.text).toContain("19:00");
    expect(msg.text).toContain("Padel Club (Tunis)");
    expect(msg.link).toMatch(/\/matchs\/abc$/);
  });
});

import { describe, expect, it } from "vitest";
import { courtTypesLabel, filterClubs, type ClubSummary } from "@/lib/clubs";

const club = (c: Partial<ClubSummary> & Pick<ClubSummary, "slug" | "name" | "city">): ClubSummary => ({
  region: "Grand Tunis",
  area: null,
  courts: 2,
  courtTypes: ["outdoor"],
  logoUrl: null,
  ...c,
});

const clubs = [
  club({ slug: "skypadel", name: "SkyPadel", city: "Tunis", area: "Charguia 1" }),
  club({ slug: "padel-marsa", name: "Padel Marsa", city: "La Marsa" }),
  club({ slug: "padel-club-kelibia", name: "Padel Club Kélibia", city: "Kélibia", region: "Nabeul / Cap Bon" }),
];

describe("club search", () => {
  it("filters by city", () => {
    expect(filterClubs(clubs, "", "La Marsa").map((c) => c.slug)).toEqual(["padel-marsa"]);
  });
  it("matches name, case-insensitive", () => {
    expect(filterClubs(clubs, "skypadel", "").map((c) => c.slug)).toEqual(["skypadel"]);
  });
  it("ignores accents", () => {
    expect(filterClubs(clubs, "kelibia", "").map((c) => c.slug)).toEqual(["padel-club-kelibia"]);
  });
  it("matches area and region", () => {
    expect(filterClubs(clubs, "charguia", "").map((c) => c.slug)).toEqual(["skypadel"]);
    expect(filterClubs(clubs, "cap bon", "").map((c) => c.slug)).toEqual(["padel-club-kelibia"]);
  });
});

describe("courtTypesLabel", () => {
  it("joins court types in French", () => {
    expect(courtTypesLabel(["indoor", "outdoor"])).toBe("intérieur + extérieur");
  });
});

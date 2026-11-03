import { describe, expect, it } from "vitest";
import { cityGroups, courtTypesLabel, filterClubs, inArea, type ClubSummary } from "@/lib/clubs";

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
  it("filters by governorate and by Grand Tunis", () => {
    expect(filterClubs(clubs, "", "Tunis").map((c) => c.slug)).toEqual(["skypadel", "padel-marsa"]);
    expect(filterClubs(clubs, "", "Grand Tunis").map((c) => c.slug)).toEqual(["skypadel", "padel-marsa"]);
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

describe("inArea", () => {
  const marsa = { city: "La Marsa", region: "Grand Tunis" };
  const soukra = { city: "La Soukra", region: "Grand Tunis" };
  const sousse = { city: "Sousse", region: "Sousse" };

  it("covers the whole region for Grand Tunis", () => {
    expect([marsa, soukra, sousse].map((c) => inArea("Grand Tunis", c))).toEqual([true, true, false]);
  });

  it("covers a governorate's cities, or a single city", () => {
    expect([marsa, soukra].map((c) => inArea("Tunis", c))).toEqual([true, false]);
    expect(inArea("Ariana", soukra)).toBe(true);
    expect(inArea("La Marsa", marsa)).toBe(true);
    expect(inArea("Sousse", sousse)).toBe(true);
    expect(inArea("toString", sousse)).toBe(false);
  });

  it("matches everything when empty", () => expect(inArea("", sousse)).toBe(true));
});

describe("cityGroups", () => {
  it("puts Grand Tunis first and sorts cities", () => {
    expect(cityGroups([{ region: "Sousse", city: "Sousse" }, { region: "Grand Tunis", city: "Tunis" }, { region: "Grand Tunis", city: "Ariana" }])).toEqual([
      { region: "Grand Tunis", cities: ["Ariana", "Tunis"] },
      { region: "Sousse", cities: ["Sousse"] },
    ]);
  });
});

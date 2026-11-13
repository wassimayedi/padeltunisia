import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Player } from "@/db/schema";
import { AVAILABILITY_DAYS, availablePlayersSchema, availableUntilFrom, levelWindow, setAvailabilitySchema, withPlayerDefaults } from "@/lib/players";

/** No filter: what a visitor gets. */
const everyone = withPlayerDefaults(availablePlayersSchema.parse({}), null);

// The DB is faked: each awaited query takes the next entry of `results` (empty rows once they run
// out), the columns passed to every select() are kept, and transaction(fn) runs fn with the same fake.
const fake = vi.hoisted(() => ({ results: [] as unknown[][], selected: [] as string[][], calls: 0 }));
vi.mock("@/server/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "orderBy", "limit", "offset", "innerJoin", "update", "set", "returning", "delete", "insert", "values"]) chain[m] = () => chain;
  chain["select"] = (columns: Record<string, unknown>) => {
    fake.selected.push(Object.keys(columns ?? {}));
    return chain;
  };
  chain["then"] = (resolve: (rows: unknown[]) => unknown) => resolve(fake.results.shift() ?? []);
  chain["transaction"] = (fn: (tx: unknown) => unknown) => fn(chain);
  return {
    db: () => {
      fake.calls++;
      return chain;
    },
  };
});

const { availablePlayers, availablePlayersFor, myAvailability, playerContact, setAvailable, AvailabilityError } = await import("@/server/players");

const player = (patch: Partial<Player> = {}): Player => ({
  id: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
  email: "a@example.com",
  name: "Amine",
  avatarUrl: "https://example.com/a.jpg",
  phone: "22123456",
  phoneCountryCode: "216",
  gender: "male",
  level: 4,
  region: "Grand Tunis",
  city: "La Marsa",
  profileCompletedAt: new Date("2026-11-01"),
  availableUntil: null,
  availableAnonymous: false,
  availableNote: null,
  createdAt: new Date("2026-11-01"),
  updatedAt: new Date("2026-11-01"),
  ...patch,
});

beforeEach(() => {
  fake.results = [];
  fake.selected = [];
  fake.calls = 0;
});

describe("availability rules", () => {
  it("lasts AVAILABILITY_DAYS days", () => {
    const now = new Date("2026-11-13T10:00:00Z");
    expect(AVAILABILITY_DAYS).toBe(7);
    expect(availableUntilFrom(now).toISOString()).toBe("2026-11-20T10:00:00.000Z");
  });

  it("filters one level around the chosen one, within 1 to 8", () => {
    expect(levelWindow(4)).toEqual({ min: 3, max: 5 });
    expect(levelWindow(1)).toEqual({ min: 1, max: 2 });
    expect(levelWindow(8)).toEqual({ min: 7, max: 8 });
  });

  it("leaves city, level and gender out of an empty search, for the profile to fill", () => {
    expect(availablePlayersSchema.parse({})).toEqual({ club: "", page: 1 });
  });

  it("accepts up to 3 different clubs, none by default", () => {
    expect(setAvailabilitySchema.parse({ anonymous: false })).toEqual({ anonymous: false, clubSlugs: [], note: null });
    expect(setAvailabilitySchema.safeParse({ anonymous: false, clubSlugs: ["a", "b", "c"] }).success).toBe(true);
    expect(setAvailabilitySchema.safeParse({ anonymous: false, clubSlugs: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(setAvailabilitySchema.safeParse({ anonymous: false, clubSlugs: ["a", "a"] }).success).toBe(false);
  });

  it("trims the note, treats an empty one as none and caps it at 120 characters", () => {
    const note = (n: string) => setAvailabilitySchema.safeParse({ anonymous: false, note: n });
    expect(note("  Que les week-ends  ").data?.note).toBe("Que les week-ends");
    expect(note("   ").data?.note).toBeNull();
    expect(note("a".repeat(120)).success).toBe(true);
    expect(note("a".repeat(121)).success).toBe(false);
  });
});

describe("profile defaults", () => {
  const viewer = { city: "Sousse", level: 4, gender: "female" as const };
  const base = availablePlayersSchema.parse({});

  it("fills the filters left out from the profile", () => {
    expect(withPlayerDefaults(base, viewer)).toEqual({ city: "Sousse", club: "", level: 4, gender: "female", page: 1 });
  });

  it("keeps an explicit choice, including all", () => {
    expect(withPlayerDefaults({ ...base, city: "", level: 0, gender: "" }, viewer)).toMatchObject({ city: "", level: 0, gender: "" });
    expect(withPlayerDefaults({ ...base, city: "Djerba", gender: "male" }, viewer)).toMatchObject({ city: "Djerba", level: 4, gender: "male" });
  });

  it("shows everything to visitors and incomplete profiles", () => {
    expect(everyone).toEqual({ city: "", club: "", level: 0, gender: "", page: 1 });
    expect(withPlayerDefaults(base, { city: null, level: null, gender: null })).toMatchObject({ city: "", level: 0, gender: "" });
  });
});

describe("making yourself available", () => {
  it("is refused with an incomplete profile, before touching the DB", async () => {
    await expect(setAvailable(player({ phone: null }), false, [], null)).rejects.toBeInstanceOf(AvailabilityError);
    await expect(setAvailable(player({ profileCompletedAt: null }), false, [], null)).rejects.toThrow(/Complétez votre profil/);
    expect(fake.calls).toBe(0);
  });

  it("is refused when a picked club doesn't exist", async () => {
    fake.results = [[{ id: 1 }]]; // only one of the two slugs is a club
    await expect(setAvailable(player(), false, ["padel-house", "inconnu"], null)).rejects.toThrow(/n'existe pas/);
  });

  it("sets the end 7 days ahead and keeps the anonymous choice, clubs and note", async () => {
    const until = availableUntilFrom();
    fake.results = [
      [{ id: 1 }, { id: 2 }], // slugs → ids
      [player({ availableUntil: until, availableAnonymous: true, availableNote: "Que les week-ends" })], // update … returning
      [], // delete old clubs
      [], // insert new clubs
      [{ playerId: player().id, slug: "padel-house", name: "Padel House" }, { playerId: player().id, slug: "slim-padel", name: "Slim Padel" }], // clubs read back
    ];
    const state = await setAvailable(player(), true, ["padel-house", "slim-padel"], "Que les week-ends");
    expect(state).toEqual({ profileComplete: true, availableUntil: until, anonymous: true, clubSlugs: ["padel-house", "slim-padel"], note: "Que les week-ends" });
  });

  it("treats a past end as not available", async () => {
    expect((await myAvailability(player({ availableUntil: new Date(Date.now() - 1000) }))).availableUntil).toBeNull();
    expect((await myAvailability(player({ profileCompletedAt: null }))).profileComplete).toBe(false);
  });
});

describe("public list", () => {
  const listed = { id: "p1", name: "Sarra", avatarUrl: "https://example.com/s.jpg", level: 5, gender: "female", city: "Sousse", note: null, availableUntil: new Date("2026-11-20") };

  it("never selects the phone number", async () => {
    await availablePlayers(everyone);
    for (const columns of fake.selected) {
      expect(columns).not.toContain("phone");
      expect(columns).not.toContain("phoneCountryCode");
    }
  });

  it("hides name and photo of anonymous players, keeps level, gender and city", async () => {
    fake.results = [[{ ...listed, anonymous: true }, { ...listed, id: "p2", anonymous: false }], []];
    const { players } = await availablePlayers(everyone);
    expect(players[0]).toEqual({ ...listed, name: null, avatarUrl: null, clubs: [] });
    expect(players[1]).toEqual({ ...listed, id: "p2", clubs: [] });
    expect(players[0]).not.toHaveProperty("anonymous");
  });

  it("shows the note on the card, also for anonymous players", async () => {
    fake.results = [[{ ...listed, anonymous: true, note: "Tous les jours à 19h sauf le week-end" }], []];
    const { players } = await availablePlayers(everyone);
    expect(players[0]).toMatchObject({ name: null, note: "Tous les jours à 19h sauf le week-end" });
  });

  it("puts each player's clubs on their own card", async () => {
    fake.results = [
      [{ ...listed, anonymous: false }, { ...listed, id: "p2", anonymous: false }],
      [
        { playerId: "p2", slug: "padel-house", name: "Padel House" },
        { playerId: "p1", slug: "slim-padel", name: "Slim Padel" },
        { playerId: "p2", slug: "treffel", name: "Treffel Padel Club" },
      ],
    ];
    const { players } = await availablePlayers(everyone);
    expect(players[0]!.clubs).toEqual([{ slug: "slim-padel", name: "Slim Padel" }]);
    expect(players[1]!.clubs).toEqual([{ slug: "padel-house", name: "Padel House" }, { slug: "treffel", name: "Treffel Padel Club" }]);
  });
});

describe("list access (/joueurs)", () => {
  it("gives visitors nothing, without touching the DB", async () => {
    await expect(availablePlayersFor(availablePlayersSchema.parse({}), null)).resolves.toBeNull();
    expect(fake.calls).toBe(0);
  });

  it("gives logged-in players the list, filtered on their profile", async () => {
    fake.results = [[{ id: "p1", name: "Sarra", avatarUrl: null, anonymous: false, level: 4, gender: "male", city: "La Marsa", note: null, availableUntil: new Date("2026-11-20") }], []];
    const result = await availablePlayersFor(availablePlayersSchema.parse({}), player());
    expect(result?.filters).toEqual({ city: "La Marsa", club: "", level: 4, gender: "male", page: 1 });
    expect(result?.players.map((p) => p.id)).toEqual(["p1"]);
    // The viewer comes with the list, so the page knows their button and card on first paint.
    expect(result?.me).toMatchObject({ id: player().id, level: 4, gender: "male", city: "La Marsa", availability: { profileComplete: true, availableUntil: null } });
    expect(fake.calls).toBeGreaterThan(0);
  });
});

describe("contact", () => {
  it("is refused to a viewer whose profile is incomplete, before touching the DB", async () => {
    await expect(playerContact(player({ level: null }), "p1")).rejects.toThrow(/pour contacter un joueur/);
    expect(fake.calls).toBe(0);
  });

  it("is refused when the player is no longer listed", async () => {
    await expect(playerContact(player(), "p1")).rejects.toThrow(/plus disponible/);
  });

  it("returns the number of a listed player", async () => {
    fake.results = [[{ phone: "55123456", phoneCountryCode: "216" }]];
    await expect(playerContact(player(), "p1")).resolves.toEqual({ phone: "55123456", phoneCountryCode: "216" });
  });
});

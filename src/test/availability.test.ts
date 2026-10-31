import { describe, expect, it } from "vitest";
import { earliestTimeToday, freeCourtsAt, toMinutes, upcomingTime } from "@/lib/availability";
import { parsePadUp, parsePlanning, parseSociety } from "@/server/availability";

// Trimmed from a real Balle Jaune plannings-integrated fragment.
const court = (name: string, slots: string) =>
  `<div class="schedule-container" data-color="#039be5"><div class="schedule-header"><div class="schedule-header-name media schedule-header-with-color" style=""><div class="color-sticker pull-left media-object" style="background-color:#039be5">&nbsp;&nbsp;</div><div class="media-body text-ellipsis" title="" data-placement="bottom">${name}</div></div></div><table class="table schedule-table-slots " data-date="1"><tbody>${slots}</tbody></table></div>`;
const slot = (cls: string, start: number) =>
  `<tr class="sts-tr "><td class="sts-td slot-time "><div class="slot-time-open" data-timestamp="1793401200">x</div></td><td class="sts-td "><a class="slot ${cls} bj_0d61ee50c386588d" data-timestart="${start}" data-duration="90" data-row="1"><div class="media"><div class="media-body"><span class="slot-hour-zoom">x</span>Réservé</div></div><span class="slot-custom-text text-ellipsis"> Payee </span></a></td></tr>`;

const html =
  court("T1-Eau Délice", slot("slot-expired slot-today slot-disabled slot-free", 360) + slot("slot-free slot-free-full", 450) + slot("slot-booked slot-booked-user", 540)) +
  court("COURT 3", slot("slot-booked slot-booked-libelle", 450) + slot("slot-free slot-free-full slot-half", 540));

describe("Balle Jaune planning", () => {
  const plannings = parsePlanning(html);

  it("reads each court and whether its slots are free, skipping past ones", () => {
    expect(plannings).toEqual([
      { court: "T1-Eau Délice", slots: [{ start: 450, duration: 90, free: true }, { start: 540, duration: 90, free: false }] },
      { court: "COURT 3", slots: [{ start: 450, duration: 90, free: false }, { start: 540, duration: 90, free: true }] },
    ]);
  });

  it("finds courts free around the requested time", () => {
    expect(freeCourtsAt(plannings, toMinutes("08:00"))).toEqual([{ court: "T1-Eau Délice", starts: ["07:30"] }]);
    expect(freeCourtsAt(plannings, toMinutes("09:00"))).toEqual([{ court: "COURT 3", starts: ["09:00"] }]);
    expect(freeCourtsAt(plannings, toMinutes("12:00"))).toEqual([]);
  });
});

describe("PadUp planning", () => {
  // Trimmed from api/establishments/search/get/booking: booked slots are absent from the list.
  const courts = [
    { establishmentDTO: { name: "LION" }, plannings: [{ fromStr: "8:00", toStr: "9:30" }, { fromStr: "12:30", toStr: "14:00" }, { fromStr: "23:00", toStr: "00:30" }] },
    { establishmentDTO: { name: "PRINCE" }, plannings: null },
  ];

  it("reads listed slots as free, including the one past midnight", () => {
    expect(parsePadUp(courts, null)).toEqual([
      { court: "LION", slots: [{ start: 480, duration: 90, free: true }, { start: 750, duration: 90, free: true }, { start: 1380, duration: 90, free: true }] },
      { court: "PRINCE", slots: [] },
    ]);
  });

  it("drops today's slots that have already started", () => {
    expect(parsePadUp(courts, 10 * 60 + 51)[0]!.slots.map((s) => s.start)).toEqual([750, 1380]);
  });
});

describe("Padel Society planning", () => {
  // Trimmed from /api/courts and /api/agenda-slots: every slot is listed with its appointment count.
  const courts = [{ uuid: "t8", name: "Terrain  8", public: true, agenda_type: "terrain" }];
  const days = {
    t8: [{ slots: [{ start: "08:00", end: "09:30", appointments: 1 }, { start: "18:30", end: "20:00", appointments: 0 }, { start: "23:00", end: "00:30", appointments: 0 }] }],
  };

  it("reads slots without appointments as free", () => {
    expect(parseSociety(courts, days, null)).toEqual([
      { court: "Terrain 8", slots: [{ start: 480, duration: 90, free: false }, { start: 1110, duration: 90, free: true }, { start: 1380, duration: 90, free: true }] },
    ]);
  });

  it("drops today's slots that have already started", () => {
    expect(parseSociety(courts, days, 19 * 60)[0]!.slots.map((s) => s.start)).toEqual([1380]);
  });
});

describe("search time", () => {
  it("keeps the current half hour in Tunisia", () => {
    // 18:10 UTC is 19:10 in Tunis.
    expect(earliestTimeToday(new Date("2026-11-02T18:10:00Z"))).toBe(19 * 60);
  });

  it("moves a past time of today to the next one offered", () => {
    expect(upcomingTime(0, "19:00", 20 * 60 + 30)).toBe("20:30");
    expect(upcomingTime(0, "21:00", 20 * 60 + 30)).toBe("21:00");
    expect(upcomingTime(1, "08:00", 20 * 60 + 30)).toBe("08:00");
  });
});

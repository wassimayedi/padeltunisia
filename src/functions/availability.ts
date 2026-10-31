// Server function for the free-court search. Handlers run only on the server.
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { clubs } from "@/db/schema";
import { freeCourtsAt, MAX_DAY, toMinutes, type ClubAvailability } from "@/lib/availability";
import type { ClubSummary } from "@/lib/clubs";
import { availabilityCityGroups, availabilityClubs, courtPlannings } from "@/server/availability";
import { db } from "@/server/db";

/**
 * Clubs with at least one free court around `time` on `day` (0 = today), among those whose planning we
 * can read; only in `city` when given, so other cities' plannings aren't fetched.
 */
export const searchFreeCourts = createServerFn()
  .validator(z.object({ day: z.number().int().min(0).max(MAX_DAY), time: z.string().regex(/^\d{2}:\d{2}$/), city: z.string() }))
  .handler(async ({ data }) => {
    const [rows, readable] = await Promise.all([
      db()
      .select({
        slug: clubs.slug,
        name: clubs.name,
        region: clubs.region,
        city: clubs.city,
        area: clubs.area,
        courts: clubs.courts,
        courtTypes: clubs.courtTypes,
        logoUrl: clubs.logoUrl,
        availabilityUrl: clubs.availabilityUrl,
      })
      .from(clubs)
      .where(and(isNotNull(clubs.availabilityUrl), data.city ? eq(clubs.city, data.city) : undefined))
      .orderBy(asc(clubs.name)),
      availabilityClubs(),
    ]);
    const minutes = toMinutes(data.time);
    const results = await Promise.all(
      rows.map(async ({ availabilityUrl, ...club }) => {
        const plannings = await courtPlannings(availabilityUrl!, data.day);
        return plannings && { club: club as ClubSummary, courts: freeCourtsAt(plannings, minutes) };
      }),
    );
    const read = results.filter((r) => r !== null);
    return {
      clubs: read.filter((r) => r.courts.length > 0) satisfies ClubAvailability[],
      checked: read.length,
      cityGroups: await availabilityCityGroups(readable),
      // Every club whose planning we read, whatever the filter: the page's static club list.
      readable,
    };
  });

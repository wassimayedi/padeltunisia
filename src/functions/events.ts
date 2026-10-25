// Server functions for the event calendar (see functions/clubs.ts for the pattern).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { eventBySlug, upcomingEvents } from "@/server/events";
import { latestNews } from "@/server/news";

export const getEvents = createServerFn()
  .validator(z.object({ limit: z.number().int().positive().optional(), tunisiaFirst: z.boolean().optional() }).optional())
  .handler(({ data }) => upcomingEvents(data ?? {}));

export const getEvent = createServerFn()
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const event = await eventBySlug(data.slug);
    if (!event) return null;
    const [news, upcoming] = await Promise.all([latestNews({ eventId: event.id, limit: 4 }), upcomingEvents({ limit: 4 })]);
    return { event, news, others: upcoming.filter((e) => e.slug !== event.slug).slice(0, 3) };
  });

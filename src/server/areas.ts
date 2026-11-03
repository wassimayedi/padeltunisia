import { eq, inArray } from "drizzle-orm";

import { clubs } from "@/db/schema";
import { areaCities, GRAND_TUNIS } from "@/lib/clubs";

/** SQL for the area picked in a city filter: Grand Tunis, a governorate ("Tunis" with La Marsa…) or one city. */
export const clubInArea = (area: string) => (!area ? undefined : area === GRAND_TUNIS ? eq(clubs.region, area) : inArray(clubs.city, areaCities(area)));

import { boolean, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const courtType = pgEnum("court_type", ["indoor", "outdoor", "covered"]);

export const clubs = pgTable(
  "clubs",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    region: text("region").notNull(),
    city: text("city").notNull(),
    /** Neighbourhood or road within the city, e.g. "Charguia 1". */
    area: text("area"),
    address: text("address").notNull(),
    /** Null when the directory doesn't list a court count. */
    courts: integer("courts"),
    courtTypes: courtType("court_types").array().notNull().default([]),
    phones: text("phones").array().notNull().default([]),
    website: text("website"),
    facebook: text("facebook"),
    instagram: text("instagram"),
    openingHours: text("opening_hours"),
    /** Planning read for free courts: a Balle Jaune widget (plannings-integrated URL with id and key) a PadUp club as `https://padup.net/?clubId=<id>`, or Padel Society's /api/agenda-slots (needs PADEL_SOCIETY_PHONE). */
    availabilityUrl: text("availability_url"),
    logoUrl: text("logo_url"),
    /** Directory page the data was taken from. */
    sourceUrl: text("source_url"),
    description: text("description"),
    amenities: text("amenities").array().notNull().default([]),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("clubs_city_idx").on(t.city), index("clubs_region_idx").on(t.region)],
);

export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;
export type CourtType = (typeof courtType.enumValues)[number];

export const eventScope = pgEnum("event_scope", ["tn", "int"]);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    /** Venue or city as announced; null while "lieu à confirmer". */
    venue: text("venue"),
    country: text("country"),
    scope: eventScope("scope").notNull(),
    /** Circuit category, e.g. "FIP Bronze", "FTT P25". */
    level: text("level").notNull(),
    /** Hosting club, when it is in the directory. */
    clubId: integer("club_id").references(() => clubs.id, { onDelete: "set null" }),
    /** Official event page. */
    url: text("url"),
    posterUrl: text("poster_url"),
    /** Site the listing was taken from, e.g. "padelfip.com". */
    source: text("source"),
    description: text("description"),
    // Practical details for players; shown on the event page when filled in.
    /** Where to sign up, e.g. the FTTLP tournament page. */
    registrationUrl: text("registration_url"),
    registrationDeadline: date("registration_deadline"),
    drawDate: date("draw_date"),
    /** Free text, e.g. "70 DT par personne". */
    entryFee: text("entry_fee"),
    /** Draws played, e.g. ["Hommes : P50, P100, P250", "Femmes : P50, P100"]. */
    draws: text("draws").array().notNull().default([]),
    tournamentDirector: text("tournament_director"),
    referee: text("referee"),
    officialBall: text("official_ball"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("events_start_date_idx").on(t.startDate), index("events_club_id_idx").on(t.clubId)],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventScope = (typeof eventScope.enumValues)[number];

/** Curated headlines linking to articles on other sites. */
export const news = pgTable(
  "news",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    publishedOn: date("published_on").notNull(),
    /** The source only gave a relative date ("il y a 2 semaines"). */
    dateApproximate: boolean("date_approximate").notNull().default(false),
    scope: eventScope("scope").notNull(),
    /** Publication name, e.g. "FIP", "The Padel Paper". */
    source: text("source").notNull(),
    /** The original article; also the natural key for deduplication. */
    url: text("url").notNull().unique(),
    imageUrl: text("image_url"),
    /** Club or event the story is about, for internal links. */
    clubId: integer("club_id").references(() => clubs.id, { onDelete: "set null" }),
    eventId: integer("event_id").references(() => events.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("news_published_on_idx").on(t.publishedOn), index("news_club_id_idx").on(t.clubId), index("news_event_id_idx").on(t.eventId)],
);

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;

/** Original editorial articles, each with its own page under /articles/:slug. */
export const magazine = pgTable(
  "magazine",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    /** "Tunisie", "International" or "Guide". */
    category: text("category").notNull(),
    /** Lead paragraph, shown on cards and under the title. */
    excerpt: text("excerpt").notNull(),
    /** Article body in Markdown (GFM tables allowed); rendered to HTML on the server. */
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    keywords: text("keywords").array().notNull().default([]),
    sources: jsonb("sources").$type<{ label: string; url: string }[]>().notNull().default([]),
    /** Articles stay hidden until this date, so publication can be scheduled. */
    publishedOn: date("published_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("magazine_published_on_idx").on(t.publishedOn)],
);

export type MagazineArticle = typeof magazine.$inferSelect;
export type NewMagazineArticle = typeof magazine.$inferInsert;

export const contactTopic = pgEnum("contact_topic", ["club", "tournoi", "partenariat", "autre"]);
export const contactStatus = pgEnum("contact_status", ["new", "read", "done"]);

/** Messages sent through the /contact form. Triage them by updating `status`. */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    topic: contactTopic("topic").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    /** Club or company the sender writes for. */
    organization: text("organization"),
    message: text("message").notNull(),
    status: contactStatus("status").notNull().default("new"),
    /** SHA-256 of the sender's IP, only for rate limiting; the IP itself is never stored. */
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt), index("contact_messages_ip_hash_idx").on(t.ipHash, t.createdAt)],
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type ContactTopic = (typeof contactTopic.enumValues)[number];

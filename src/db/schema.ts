import { sql } from "drizzle-orm";
import { boolean, check, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
    /** Photographer of a stock cover (Pixabay), credited under it; null for generated covers. */
    imageCredit: jsonb("image_credit").$type<{ name: string; url: string }>(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    keywords: text("keywords").array().notNull().default([]),
    sources: jsonb("sources").$type<{ label: string; url: string }[]>().notNull().default([]),
    /** Articles stay hidden until this date, so publication can be scheduled. */
    publishedOn: date("published_on").notNull(),
    /** Meta post ids set by scripts/social/push.ts; null until the article is posted there. */
    facebookPostId: text("facebook_post_id"),
    instagramPostId: text("instagram_post_id"),
    /** Story ids, same idea; stories are only published on the article's publication day. */
    facebookStoryId: text("facebook_story_id"),
    instagramStoryId: text("instagram_story_id"),
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

// Find match: players log in through Supabase (Google) but every row lives here.

export const playerGender = pgEnum("player_gender", ["male", "female"]);
export const matchGender = pgEnum("match_gender", ["male", "female", "mixed"]);
export const matchStatus = pgEnum("match_status", ["open", "full", "cancelled", "played"]);
export const matchPlayerStatus = pgEnum("match_player_status", ["pending", "accepted", "rejected", "left", "removed"]);

/** One row per Supabase user; the profile is edited only through our server functions. */
export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Supabase auth user id (JWT `sub`). */
    authUserId: uuid("auth_user_id").notNull().unique(),
    email: text("email"),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    /** Local number without the country code. */
    phone: text("phone"),
    phoneCountryCode: text("phone_country_code").notNull().default("216"),
    gender: playerGender("gender"),
    /** Self-assessed level, 1 (beginner) to 8 (competition). */
    level: integer("level"),
    /** Default search filter. */
    region: text("region"),
    city: text("city"),
    /** Null until onboarding (phone, gender, level) is done; required to create or join a match. */
    profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("players_level_check", sql`${t.level} between 1 and 8`)],
);

export type Player = typeof players.$inferSelect;
export type PlayerGender = (typeof playerGender.enumValues)[number];

/** A match looking for players in a level range. The creator is not a row of match_players. */
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    /** City and region come from the club. */
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    gender: matchGender("gender").notNull(),
    levelMin: integer("level_min").notNull(),
    levelMax: integer("level_max").notNull(),
    /** Players wanted besides the creator. */
    spots: integer("spots").notNull(),
    status: matchStatus("status").notNull().default("open"),
    /** The creator already booked the court. */
    courtBooked: boolean("court_booked").notNull().default(false),
    /** Visitors who aren't logged in don't see who plays (names, photos); members do. */
    membersOnly: boolean("members_only").notNull().default(true),
    note: text("note"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("matches_status_starts_at_idx").on(t.status, t.startsAt),
    index("matches_club_id_idx").on(t.clubId, t.startsAt),
    index("matches_creator_id_idx").on(t.creatorId, t.startsAt),
    check("matches_time_check", sql`${t.endsAt} > ${t.startsAt}`),
    check("matches_level_check", sql`${t.levelMin} between 1 and 8 and ${t.levelMax} between 1 and 8 and ${t.levelMin} <= ${t.levelMax}`),
    check("matches_spots_check", sql`${t.spots} between 1 and 3`),
  ],
);

export type Match = typeof matches.$inferSelect;
export type MatchGender = (typeof matchGender.enumValues)[number];
export type MatchStatus = (typeof matchStatus.enumValues)[number];

/** Join requests and accepted players of a match. */
export const matchPlayers = pgTable(
  "match_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: matchPlayerStatus("status").notNull().default("pending"),
    /** Player level when the request was sent. */
    levelAtJoin: integer("level_at_join").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("match_players_match_player_idx").on(t.matchId, t.playerId), index("match_players_player_idx").on(t.playerId, t.status)],
);

export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type MatchPlayerStatus = (typeof matchPlayerStatus.enumValues)[number];

/** Outbox and log of WhatsApp/email messages sent about matches. */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    /** join_request, request_accepted, request_rejected, request_cancelled, player_left, match_cancelled. */
    type: text("type").notNull(),
    /** email or whatsapp. */
    channel: text("channel").notNull(),
    /** pending, sent or failed. */
    status: text("status").notNull().default("pending"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [index("notifications_status_idx").on(t.status, t.createdAt), index("notifications_player_idx").on(t.playerId, t.createdAt)],
);

export type Notification = typeof notifications.$inferSelect;

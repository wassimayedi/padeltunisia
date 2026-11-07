// Daily promotional messages about the site's features, posted by promo.ts (one per day, in
// rotation). Some quote live figures from the database; a message returns null to sit out a day
// when its figures are too small to be worth showing. Edit freely: keep `key` stable once a
// message has been posted (it drives the rotation), titles under ~70 characters, texts under ~140,
// and image text to plain characters (the font has no emoji or arrows).
import {
  and,
  count,
  countDistinct,
  eq,
  gt,
  gte,
  isNotNull,
  lte,
} from "drizzle-orm";

import { clubs, events, magazine, matches } from "../../src/db/schema.ts";
import { db } from "../mcp/config.ts";

export type PromoStats = {
  clubs: number;
  cities: number;
  /** Clubs whose free courts are shown live on /terrains. */
  liveClubs: number;
  /** Open matches that haven't started yet. */
  openMatches: number;
  /** Tunisian tournaments not over yet. */
  upcomingEvents: number;
  nextEvent: {
    title: string;
    startDate: string;
    venue: string | null;
    slug: string;
  } | null;
  articles: number;
};

export type PromoContent = {
  title: string;
  text: string;
  /** Story button text. */
  cta: string;
  /** Page on the site, e.g. "/clubs". */
  path: string;
};

export type Promo = {
  key: string;
  /** Pill shown above the title. */
  category: string;
  build: (s: PromoStats) => PromoContent | null;
};

export async function loadPromoStats(today: string): Promise<PromoStats> {
  const [clubRow] = await db
    .select({ clubs: count(), cities: countDistinct(clubs.city) })
    .from(clubs);
  const [liveRow] = await db
    .select({ n: count() })
    .from(clubs)
    .where(isNotNull(clubs.availabilityUrl));
  const [matchRow] = await db
    .select({ n: count() })
    .from(matches)
    .where(and(eq(matches.status, "open"), gt(matches.startsAt, new Date())));
  const upcoming = await db
    .select({
      title: events.title,
      startDate: events.startDate,
      venue: events.venue,
      slug: events.slug,
    })
    .from(events)
    .where(and(eq(events.scope, "tn"), gte(events.endDate, today)))
    .orderBy(events.startDate);
  const [articleRow] = await db
    .select({ n: count() })
    .from(magazine)
    .where(lte(magazine.publishedOn, today));

  return {
    clubs: clubRow?.clubs ?? 0,
    cities: clubRow?.cities ?? 0,
    liveClubs: liveRow?.n ?? 0,
    openMatches: matchRow?.n ?? 0,
    upcomingEvents: upcoming.length,
    // The next one still to start, not one already under way.
    nextEvent: upcoming.find((e) => e.startDate >= today) ?? null,
    articles: articleRow?.n ?? 0,
  };
}

/** "12 mars" */
const frenchDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

export const promos: Promo[] = [
  // Clubs
  {
    key: "clubs-near-you",
    category: "Clubs",
    build: (s) =>
      s.clubs < 5
        ? null
        : {
            title: "Tu cherches un club de padel près de chez toi ?",
            text: `${s.clubs} clubs dans ${s.cities} villes : adresses, terrains, horaires et contacts, tout est sur Connect.`,
            cta: "Trouve ton club",
            path: "/clubs",
          },
  },
  {
    key: "clubs-compare",
    category: "Clubs",
    build: () => ({
      title: "Indoor, outdoor ou couvert : quel club choisir ?",
      text: "Compare les clubs de padel en Tunisie : nombre de terrains, type de court, équipements et horaires.",
      cta: "Compare les clubs",
      path: "/clubs",
    }),
  },

  // Free courts
  {
    key: "free-courts-tonight",
    category: "Terrains libres",
    build: (s) =>
      s.liveClubs < 2
        ? null
        : {
            title: "Un terrain libre ce soir ?",
            text: `Vois en direct les créneaux disponibles dans ${s.liveClubs} clubs, sans passer un seul coup de fil.`,
            cta: "Voir les terrains libres",
            path: "/terrains",
          },
  },
  {
    key: "free-courts-weekend",
    category: "Terrains libres",
    build: (s) =>
      s.liveClubs < 1
        ? null
        : {
            title: "Envie de jouer ce week-end ?",
            text: "Repère les terrains encore libres samedi et dimanche, club par club, mis à jour en direct.",
            cta: "Voir les terrains libres",
            path: "/terrains",
          },
  },

  // Matches
  {
    key: "find-fourth-player",
    category: "Trouver un match",
    build: () => ({
      title: "Il vous manque un 4e joueur ?",
      text: "Crée ton match sur Connect : choisis ton club, ton créneau et le niveau, les joueurs te rejoignent.",
      cta: "Crée ton match",
      path: "/matchs/creer",
    }),
  },
  {
    key: "players-your-level",
    category: "Trouver un match",
    build: () => ({
      title: "Trouver des joueurs de ton niveau ?",
      text: "Filtre les matchs par niveau, par ville et par genre, et rejoins une partie équilibrée.",
      cta: "Trouve un match",
      path: "/matchs",
    }),
  },
  {
    key: "open-matches",
    category: "Trouver un match",
    build: (s) =>
      s.openMatches < 2
        ? null
        : {
            title: "Des matchs cherchent encore des joueurs",
            text: `${s.openMatches} matchs ouverts t'attendent en ce moment. Choisis le tien et rejoins la partie en deux clics.`,
            cta: "Rejoins un match",
            path: "/matchs",
          },
  },
  {
    key: "new-in-town",
    category: "Trouver un match",
    build: () => ({
      title: "Pas de partenaire de padel sous la main ?",
      text: "Rejoins des matchs ouverts près de chez toi et rencontre des joueurs de ton niveau.",
      cta: "Trouve des joueurs",
      path: "/matchs",
    }),
  },

  // Tournaments
  {
    key: "next-tournament",
    category: "Tournois",
    build: (s) =>
      !s.nextEvent
        ? null
        : {
            title: `Prochain tournoi : ${s.nextEvent.title}`,
            text: `Dès le ${frenchDay(s.nextEvent.startDate)}${s.nextEvent.venue ? ` à ${s.nextEvent.venue}` : ""}. Dates, inscription et tableaux : toutes les infos sur Connect.`,
            cta: "Voir le tournoi",
            path: `/evenements/${s.nextEvent.slug}`,
          },
  },
  {
    key: "tournaments-calendar",
    category: "Tournois",
    build: (s) =>
      s.upcomingEvents < 2
        ? null
        : {
            title: "Prêt pour ton premier tournoi ?",
            text: `${s.upcomingEvents} tournois à venir en Tunisie, avec les dates, les lieux et les liens d'inscription.`,
            cta: "Voir le calendrier",
            path: "/evenements",
          },
  },

  // Guide
  {
    key: "guide-start",
    category: "Guide du padel",
    build: () => ({
      title: "Débuter le padel : par où commencer ?",
      text: "Règles, raquette, chaussures, prix d'une partie en Tunisie : notre guide pour te lancer du bon pied.",
      cta: "Lis le guide",
      path: "/guide",
    }),
  },
  {
    key: "guide-rules",
    category: "Guide du padel",
    build: () => ({
      title: "Tu connais vraiment les règles du padel ?",
      text: "Service, vitres, grillage, comptage des points : les règles expliquées simplement, pour ne plus douter en match.",
      cta: "Révise les règles",
      path: "/guide",
    }),
  },

  // News and magazine
  {
    key: "padel-news",
    category: "Actualités",
    build: (s) =>
      s.articles < 5
        ? null
        : {
            title: "Toute l'actu du padel en Tunisie",
            text: `Résultats, tournois, clubs qui ouvrent, conseils : ${s.articles} articles pour suivre le padel ici et ailleurs.`,
            cta: "Lis l'actu",
            path: "/articles",
          },
  },
  {
    key: "padel-questions",
    category: "Actualités",
    build: () => ({
      title: "Une question sur le padel ?",
      text: "Prix d'une heure de jeu, choix de raquette, blessures, matériel : nos articles répondent à tes questions.",
      cta: "Lis nos articles",
      path: "/articles",
    }),
  },

  // Everything
  {
    key: "all-in-one",
    category: "Connect",
    build: (s) => ({
      title: "Clubs, terrains, matchs, tournois : tout le padel en Tunisie",
      text: `${s.clubs >= 5 ? `${s.clubs} clubs, des` : "Des"} matchs ouverts et le calendrier des tournois : une seule adresse pour savoir où, quand et avec qui jouer.`,
      cta: "Découvre Connect",
      path: "/",
    }),
  },
];

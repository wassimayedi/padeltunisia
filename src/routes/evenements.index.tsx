import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/site-chrome";
import { EventCard } from "@/components/cards";
import { getEvents } from "@/functions/events";
import { eventPlace, monthLabel, type EventSummary } from "@/lib/events";
import { absoluteUrl, pageTitle } from "@/lib/site";

function eventJsonLd(e: EventSummary) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: e.title,
    sport: "Padel",
    startDate: e.startDate,
    endDate: e.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: e.url ?? undefined,
    image: e.posterUrl ? absoluteUrl(e.posterUrl) : undefined,
    location: {
      "@type": "Place",
      name: eventPlace(e),
      url: e.club ? absoluteUrl(`/clubs/${e.club.slug}`) : undefined,
      address: { "@type": "PostalAddress", addressLocality: e.venue ?? undefined, addressCountry: e.scope === "tn" ? "TN" : (e.country ?? undefined) },
    },
  };
}

export const Route = createFileRoute("/evenements/")({
  loader: () => getEvents(),
  head: ({ loaderData }) => ({
    meta: [
      { title: pageTitle("Tournois de padel 2026 — Tunisie & international") },
      { name: "description", content: "Calendrier des tournois de padel : étapes FTT et P25 en Tunisie, circuit FIP, Premier Padel, Coupe du monde. Dates, lieux et niveaux." },
      { property: "og:title", content: "Calendrier des tournois de padel — PadelTunisia" },
      { property: "og:description", content: "Les tournois de padel en Tunisie et les grands rendez-vous internationaux." },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/evenements") }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify((loaderData ?? []).map(eventJsonLd)) }],
  }),
  component: EventsPage,
});

const tabs = [
  { key: "all", label: "Tous" },
  { key: "tn", label: "Tunisie" },
  { key: "int", label: "International" },
] as const;

function EventsPage() {
  const events = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const list = events.filter((e) => tab === "all" || e.scope === tab);
  // Group by the month the event starts in; the list is already sorted by start date.
  const months = new Map<string, EventSummary[]>();
  for (const e of list) months.set(monthLabel(e.startDate), [...(months.get(monthLabel(e.startDate)) ?? []), e]);

  return (
    <>
      <PageHero eyebrow="Agenda" title="Tournois de padel" intro="Étapes FTT en Tunisie, circuit FIP, Premier Padel et grands rendez-vous internationaux." />
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <div className="mb-8 flex gap-2 overflow-x-auto" role="tablist">
          {tabs.map((t) => {
            const n = t.key === "all" ? events.length : events.filter((e) => e.scope === t.key).length;
            return (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {t.label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
        <div key={tab} className="grid gap-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {[...months].map(([month, items]) => (
            <section key={month}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-court first-letter:uppercase">{month}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((e) => <EventCard key={e.slug} e={e} />)}
              </ul>
            </section>
          ))}
          {list.length === 0 && <p className="py-16 text-center text-muted-foreground">Aucun tournoi à venir pour le moment.</p>}
        </div>
      </div>
    </>
  );
}

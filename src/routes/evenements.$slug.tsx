import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, CalendarCheck, CalendarDays, ChevronRight, Clock, ExternalLink, Flag, MapPin, Trophy } from "lucide-react";
import { ClubLogo, EventCard, NewsCard } from "@/components/cards";
import { getEvent } from "@/functions/events";
import { circuitName, dateRange, dateRangeLong, durationDays, eventPlace } from "@/lib/events";
import { absoluteUrl } from "@/lib/site";

type EventData = NonNullable<Awaited<ReturnType<typeof getEvent>>>["event"];

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Factual summary from the listing, used until the event has its own description. */
function summary(e: EventData) {
  const place = e.club ? `${e.club.name} (${e.club.city})` : e.venue ? `${e.venue}${e.country && e.country !== e.venue ? `, ${e.country}` : ""}` : null;
  const when = dateRangeLong(e.startDate, e.endDate);
  const verb = e.status === "past" ? "s'est déroulé" : e.status === "ongoing" ? "se déroule" : "se déroulera";
  const circuit = circuitName(e.level);
  return [
    `${e.title} ${verb} ${when}${place ? ` à ${place}` : ""}.`,
    `Il s'agit d'un tournoi de catégorie ${e.level}${circuit ? ` inscrit dans ${circuit}` : ""}.`,
    e.scope === "tn" && e.registrationUrl ? "Les inscriptions se font en ligne sur la plateforme FTTLP." : null,
  ].filter(Boolean).join(" ");
}

export const Route = createFileRoute("/evenements/$slug")({
  loader: async ({ params }) => {
    const data = await getEvent({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [{ title: "Tournoi introuvable | PadelTunisia" }, { name: "robots", content: "noindex" }] };
    const url = absoluteUrl(`/evenements/${params.slug}`);
    const where = e.club?.name ?? e.venue ?? "lieu à confirmer";
    const title = `${e.title} — ${dateRange(e.startDate, e.endDate)}, ${where} | PadelTunisia`;
    const description = (e.description ?? summary(e)).slice(0, 158);
    const image = e.posterUrl ? absoluteUrl(e.posterUrl) : e.club?.logoUrl ? absoluteUrl(e.club.logoUrl) : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: `${e.title} — ${dateRange(e.startDate, e.endDate)}` },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: e.posterUrl ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: e.title,
            sport: "Padel",
            url,
            description: e.description ?? summary(e),
            startDate: e.startDate,
            endDate: e.endDate,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            image: image ? [image] : undefined,
            location: {
              "@type": "Place",
              name: where,
              url: e.club ? absoluteUrl(`/clubs/${e.club.slug}`) : undefined,
              address: {
                "@type": "PostalAddress",
                streetAddress: e.club?.address,
                addressLocality: e.club?.city ?? e.venue ?? undefined,
                addressCountry: e.scope === "tn" ? "TN" : (e.country ?? undefined),
              },
            },
            organizer: e.club ? { "@type": "SportsActivityLocation", name: e.club.name, url: absoluteUrl(`/clubs/${e.club.slug}`) } : undefined,
            offers: e.registrationUrl
              ? { "@type": "Offer", url: e.registrationUrl, availability: "https://schema.org/InStock", validThrough: e.registrationDeadline ?? undefined }
              : undefined,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Tournois", item: absoluteUrl("/evenements") },
              { "@type": "ListItem", position: 3, name: e.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Tournoi introuvable</h1>
      <Link to="/evenements" className="mt-6 inline-block font-bold text-court">← Retour au calendrier</Link>
    </div>
  ),
  component: EventPage,
});

const STATUS = {
  upcoming: { label: "À venir", className: "bg-white/15" },
  ongoing: { label: "En cours", className: "bg-lime text-navy" },
  past: { label: "Terminé", className: "bg-navy text-court-foreground" },
} as const;

function EventPage() {
  const { event: e, news, others } = Route.useLoaderData();
  const facts = [
    { Icon: CalendarDays, label: "Dates", value: dateRange(e.startDate, e.endDate) },
    { Icon: Clock, label: "Durée", value: `${durationDays(e.startDate, e.endDate)} jours` },
    { Icon: MapPin, label: "Lieu", value: eventPlace(e) },
    { Icon: Trophy, label: "Catégorie", value: e.level },
  ];
  const practical = [
    e.registrationDeadline && { label: "Date limite d'inscription", value: longDate(e.registrationDeadline) },
    e.drawDate && { label: "Tirage au sort", value: longDate(e.drawDate) },
    e.entryFee && { label: "Frais d'inscription", value: e.entryFee },
    e.tournamentDirector && { label: "Directeur du tournoi", value: e.tournamentDirector },
    e.referee && { label: "Juge-arbitre", value: e.referee },
    e.officialBall && { label: "Balles officielles", value: e.officialBall },
  ].filter(Boolean) as { label: string; value: string }[];
  const status = STATUS[e.status];

  return (
    <article>
      <header className="court-lines relative bg-court text-court-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:pb-28 sm:pt-10">
          <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm font-semibold text-court-foreground/75">
            <Link to="/" className="hover:text-court-foreground">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/evenements" className="hover:text-court-foreground">Tournois</Link>
          </nav>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${e.scope === "tn" ? "bg-lime text-navy" : "bg-white text-navy"}`}>{e.scope === "tn" ? "Tunisie" : "International"}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
          </div>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{e.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-court-foreground/85"><CalendarDays className="h-4 w-4 shrink-0" />{dateRangeLong(e.startDate, e.endDate)} · {eventPlace(e)}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {e.registrationUrl && e.status !== "past" && (
                <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-navy transition-transform hover:-translate-y-0.5">
                  <CalendarCheck className="h-4 w-4" />S'inscrire
                </a>
              )}
              {e.url && (
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-bold backdrop-blur transition-colors hover:bg-white/25">
                  <ExternalLink className="h-4 w-4" />Page officielle
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-lift lg:grid-cols-4">
          {facts.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 bg-card p-3.5 sm:p-5">
              <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-court sm:grid"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="font-display text-base font-bold leading-snug sm:truncate sm:text-lg">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_360px]">
        <div className="order-2 grid gap-8 lg:order-1">
          {e.posterUrl && <img src={e.posterUrl} alt={`Affiche ${e.title}`} className="w-full rounded-3xl border object-cover shadow-lift" />}

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Le tournoi</h2>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{e.description ?? summary(e)}</p>
            {e.draws.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-bold">Tableaux</h3>
                <ul className="mt-3 grid gap-2">
                  {e.draws.map((d) => <li key={d} className="rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold">{d}</li>)}
                </ul>
              </>
            )}
          </section>

          {news.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Dans l'actualité</h2>
              <ul className="grid gap-4 sm:grid-cols-2">{news.map((n) => <NewsCard key={n.id} n={n} />)}</ul>
            </section>
          )}
        </div>

        <aside className="order-1 grid gap-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          {(practical.length > 0 || e.registrationUrl) && (
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Flag className="h-5 w-5 text-court" />Infos pratiques</h2>
              {practical.length > 0 && (
                <dl className="mt-4 grid gap-2">
                  {practical.map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-muted px-4 py-2.5 text-sm">
                      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
                      <dd className="font-bold first-letter:uppercase">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {e.registrationUrl && (
                <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground">
                  {e.status === "past" ? "Voir sur FTTLP" : "S'inscrire en ligne"}<ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </section>
          )}

          {e.club && (
            <Link to="/clubs/$slug" params={{ slug: e.club.slug }} className="group flex items-center gap-4 rounded-3xl border bg-card p-5 transition-shadow hover:shadow-lift">
              <ClubLogo club={{ name: e.club.name, logoUrl: e.club.logoUrl }} className="h-14 w-14 rounded-lg border text-lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Club organisateur</p>
                <p className="truncate font-display text-lg font-bold group-hover:text-court">{e.club.name}</p>
                <p className="truncate text-sm text-muted-foreground">{e.club.address}</p>
              </div>
            </Link>
          )}

          <p className="px-2 text-xs text-muted-foreground">
            {e.source && <>Source : {e.source}. Vérifiez les détails auprès de l'organisateur.{" "}</>}
            <Link to="/contact" search={{ sujet: "tournoi", club: e.club?.name ?? "" }} className="font-semibold text-court underline">Signaler une erreur</Link>
          </p>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Prochains tournois</h2>
            <Link to="/evenements" className="shrink-0 text-sm font-bold text-court">Tout le calendrier →</Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{others.map((o) => <EventCard key={o.slug} e={o} />)}</ul>
        </section>
      )}
    </article>
  );
}

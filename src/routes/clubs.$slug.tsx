import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, CalendarCheck, ChevronDown, ChevronRight, Clock, Facebook, Globe, Instagram, LayoutGrid, MapPin, Navigation, Phone, Check } from "lucide-react";
import type { Club } from "@/db/schema";
import { getClub } from "@/functions/clubs";
import { citySlug, courtTypesLabel, hoursRows, openingHoursSpec } from "@/lib/clubs";
import { absoluteUrl } from "@/lib/site";
import { Reveal } from "@/components/motion";
import { ClubCard, ClubLogo, EventCard, NewsCard } from "@/components/cards";

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const location = (c: Club) => (c.area ? `${c.area}, ${c.city}` : c.city);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Factual summary from the listing, used until the club has its own description. */
function summary(c: Club) {
  const kind = courtTypesLabel(c.courtTypes);
  const parts = [`${c.name} est un club de padel situé à ${location(c)}, dans la région ${c.region === "Grand Tunis" ? "du Grand Tunis" : `de ${c.region}`}.`];
  if (c.courts) parts.push(`Il dispose de ${plural(c.courts, "terrain")}${kind ? ` (${kind})` : ""}.`);
  if (c.openingHours) parts.push(`Le club est ouvert ${lowerFirst(c.openingHours.replaceAll(" · ", ", "))}.`);
  if (c.website) parts.push("Les réservations se font en ligne sur son site.");
  else if (c.phones[0]) parts.push(`Pour réserver un terrain, appelez le ${c.phones[0]}.`);
  return parts.join(" ");
}

function faq(c: Club) {
  const kind = courtTypesLabel(c.courtTypes);
  return [
    { q: `Où se trouve ${c.name} ?`, a: `${c.name} se trouve ${c.address} (${c.region}).` },
    c.courts && { q: `Combien de terrains compte ${c.name} ?`, a: `Le club compte ${plural(c.courts, "terrain")} de padel${kind ? ` (${kind})` : ""}.` },
    c.openingHours && { q: `Quels sont les horaires de ${c.name} ?`, a: `${c.openingHours.replaceAll(" · ", ", ")}. Les horaires peuvent varier les jours fériés : contactez le club pour confirmer.` },
    (c.website || c.phones[0] || c.instagram) && {
      q: `Comment réserver un terrain à ${c.name} ?`,
      a: c.website ? "La réservation se fait en ligne sur le site du club." : c.phones[0] ? `Appelez le club au ${c.phones.join(" ou ")}.` : "Contactez le club par message sur Instagram.",
    },
  ].filter(Boolean) as { q: string; a: string }[];
}

export const Route = createFileRoute("/clubs/$slug")({
  loader: async ({ params }) => {
    const data = await getClub({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const c = loaderData?.club;
    if (!c) return { meta: [{ title: "Club introuvable | PadelTunisia" }, { name: "robots", content: "noindex" }] };
    const url = absoluteUrl(`/clubs/${params.slug}`);
    const title = `${c.name} — Padel à ${c.city} : terrains, horaires, réservation | PadelTunisia`;
    const desc = (c.description ?? summary(c)).slice(0, 158);
    const place = c.lat != null && c.lng != null ? `${c.lat},${c.lng}` : `${c.name}, ${c.address}, Tunisie`;
    const hours = c.openingHours ? openingHoursSpec(c.openingHours) : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: `${c.name} — Club de padel à ${c.city}` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "place" },
        { property: "og:url", content: url },
        ...(c.logoUrl ? [{ property: "og:image", content: absoluteUrl(c.logoUrl) }] : []),
        ...(c.lat != null && c.lng != null
          ? [{ property: "place:location:latitude", content: String(c.lat) }, { property: "place:location:longitude", content: String(c.lng) }]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            "@id": `${url}#club`,
            name: c.name,
            url,
            description: c.description ?? summary(c),
            sport: "Padel",
            logo: c.logoUrl ? absoluteUrl(c.logoUrl) : undefined,
            image: c.logoUrl ? absoluteUrl(c.logoUrl) : undefined,
            telephone: c.phones[0],
            sameAs: [c.website, c.instagram, c.facebook].filter(Boolean),
            address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.city, addressRegion: c.region, addressCountry: "TN" },
            geo: c.lat != null && c.lng != null ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng } : undefined,
            hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
            openingHoursSpecification: hours ?? undefined,
            amenityFeature: c.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
            containedInPlace: { "@type": "City", name: c.city, containedInPlace: { "@type": "Country", name: "Tunisie" } },
            event: (loaderData.events ?? []).map((e) => ({ "@type": "SportsEvent", name: e.title, startDate: e.startDate, endDate: e.endDate, url: e.url ?? undefined })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Clubs", item: absoluteUrl("/clubs") },
              { "@type": "ListItem", position: 3, name: c.city, item: absoluteUrl(`/clubs/ville/${citySlug(c.city)}`) },
              { "@type": "ListItem", position: 4, name: c.name, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq(c).map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Club introuvable</h1>
      <Link to="/clubs" search={{ q: "", city: "" }} className="mt-6 inline-block font-bold text-court">← Retour aux clubs</Link>
    </div>
  ),
  component: ClubPage,
});

function ClubPage() {
  const { club: c, others, events, news } = Route.useLoaderData();
  const kind = courtTypesLabel(c.courtTypes);
  const hours = c.openingHours ? hoursRows(c.openingHours) : [];
  // Coordinates when known, otherwise let the map provider geocode the address.
  const place = c.lat != null && c.lng != null ? `${c.lat},${c.lng}` : `${c.name}, ${c.address}, Tunisie`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;
  const socials = [
    c.instagram && { href: c.instagram, label: "Instagram", Icon: Instagram },
    c.facebook && { href: c.facebook, label: "Facebook", Icon: Facebook },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Globe }[];
  const facts = [
    { Icon: LayoutGrid, label: "Terrains", value: c.courts != null ? String(c.courts) : "—" },
    { Icon: CalendarCheck, label: "Type", value: kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "—" },
    { Icon: Clock, label: "Horaires", value: hours.length === 1 ? hours[0]!.time : hours.length ? "Selon les jours" : "—" },
    { Icon: MapPin, label: "Région", value: c.region },
  ];
  const updated = new Date(c.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article>
      <header className="court-lines relative bg-court text-court-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:pb-28 sm:pt-10">
          <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm font-semibold text-court-foreground/75">
            <Link to="/" className="hover:text-court-foreground">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/clubs" search={{ q: "", city: "" }} className="hover:text-court-foreground">Clubs</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/clubs/ville/$city" params={{ city: citySlug(c.city) }} className="hover:text-court-foreground">{c.city}</Link>
          </nav>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <ClubLogo club={c} eager className="h-20 w-20 rounded-2xl text-3xl border-4 border-white/25 shadow-lift sm:h-28 sm:w-28 sm:rounded-3xl sm:text-4xl" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Club de padel · {c.city}</p>
                <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-5xl">{c.name}</h1>
                <p className="mt-2 flex items-start gap-2 text-sm text-court-foreground/85 sm:text-base"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{c.address}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
              {c.website && (
                <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-navy transition-transform hover:-translate-y-0.5">
                  <CalendarCheck className="h-4 w-4" />Réserver
                </a>
              )}
              {c.phones[0] && (
                <a href={tel(c.phones[0])} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-bold backdrop-blur transition-colors hover:bg-white/25">
                  <Phone className="h-4 w-4" />Appeler
                </a>
              )}
              <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-bold backdrop-blur transition-colors hover:bg-white/25">
                <Navigation className="h-4 w-4" />Itinéraire
              </a>
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
          <Reveal as="section" className="rounded-3xl border bg-card p-6 sm:p-8">
            <h2 data-reveal className="text-2xl font-bold">À propos du club</h2>
            <p data-reveal className="mt-3 text-lg leading-relaxed text-muted-foreground">{c.description ?? summary(c)}</p>
            {c.amenities.length > 0 && (
              <>
                <h3 data-reveal className="mt-8 text-lg font-bold">Équipements</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {c.amenities.map((a) => (
                    <li data-reveal key={a} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold"><Check className="h-4 w-4 text-court" />{a}</li>
                  ))}
                </ul>
              </>
            )}
          </Reveal>

          {events.length > 0 && (
            <section className="rounded-3xl border bg-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Tournois à venir au club</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {events.map((e) => <EventCard key={e.slug} e={e} />)}
              </ul>
            </section>
          )}

          {news.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">Dans l'actualité</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {news.map((n) => <NewsCard key={n.id} n={n} />)}
              </ul>
            </section>
          )}

          <section className="overflow-hidden rounded-3xl border bg-card">
            <iframe title={`Carte : ${c.name}`} loading="lazy" className="h-80 w-full border-b" src={`https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=15&output=embed`} />
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Adresse</h2>
                <p className="mt-1 text-muted-foreground">{c.address}</p>
              </div>
              <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">
                <Navigation className="h-4 w-4" />Itinéraire
              </a>
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Questions fréquentes</h2>
            <div className="mt-4 divide-y">
              {faq(c).map(({ q, a }) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Hours and contact first on mobile; sidebar on desktop */}
        <aside className="order-1 grid gap-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          {hours.length > 0 && (
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5 text-court" />Horaires d'ouverture</h2>
              <dl className="mt-4 grid gap-2">
                {hours.map(({ days, time }) => (
                  <div key={days + time} className="flex items-baseline justify-between gap-4 rounded-xl bg-muted px-4 py-2.5 text-sm">
                    <dt className="font-semibold">{days || "Horaires"}</dt>
                    <dd className="text-right font-bold tabular-nums">{time}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-3xl border bg-card p-6">
            <h2 className="text-lg font-bold">Contact</h2>
            <ul className="mt-4 grid gap-2">
              {c.website && (
                <li>
                  <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 font-semibold transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Globe className="h-5 w-5 shrink-0" /><span className="flex-1">Site web & réservation</span><ArrowUpRight className="h-4 w-4 opacity-60" />
                  </a>
                </li>
              )}
              {c.phones.map((p) => (
                <li key={p}>
                  <a href={tel(p)} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 font-semibold tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground"><Phone className="h-5 w-5 shrink-0" />{p}</a>
                </li>
              ))}
            </ul>
            {socials.length > 0 && (
              <div className="mt-4 flex gap-2 border-t pt-4">
                {socials.map(({ href, label, Icon }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} de ${c.name}`} className="grid h-11 w-11 place-items-center rounded-full bg-muted transition-colors hover:bg-accent hover:text-accent-foreground"><Icon className="h-5 w-5" /></a>
                ))}
              </div>
            )}
          </section>

          <p className="px-2 text-xs text-muted-foreground">
            Fiche mise à jour le {updated}. Les informations peuvent changer : vérifiez auprès du club avant de vous déplacer.
          </p>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Autres clubs · {c.region}</h2>
            <Link to="/clubs" search={{ q: c.region, city: "" }} className="shrink-0 text-sm font-bold text-court">Voir tout →</Link>
          </div>
          <Reveal className="grid gap-4 sm:grid-cols-3">
            {others.map((x) => <ClubCard key={x.slug} club={x} />)}
          </Reveal>
        </section>
      )}
    </article>
  );
}

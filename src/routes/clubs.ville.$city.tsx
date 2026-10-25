import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, LayoutGrid, MapPin, Sun, Warehouse } from "lucide-react";
import { ClubCard, EventCard } from "@/components/cards";
import { Reveal } from "@/components/motion";
import { getCity } from "@/functions/clubs";
import { citySlug, MIN_CLUBS_FOR_CITY_PAGE } from "@/lib/clubs";
import { absoluteUrl } from "@/lib/site";

type CityData = NonNullable<Awaited<ReturnType<typeof getCity>>>;

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const names = (list: { name: string }[]) =>
  list.length <= 1 ? (list[0]?.name ?? "") : `${list.slice(0, -1).map((c) => c.name).join(", ")} et ${list.at(-1)!.name}`;

function stats(d: CityData) {
  const courts = d.clubs.reduce((n, c) => n + (c.courts ?? 0), 0);
  const indoor = d.clubs.filter((c) => c.courtTypes.includes("indoor") || c.courtTypes.includes("covered"));
  const outdoor = d.clubs.filter((c) => c.courtTypes.includes("outdoor"));
  const allNight = d.clubs.filter((c) => c.openingHours?.includes("24h/24"));
  return { courts, indoor, outdoor, allNight };
}

function intro(d: CityData) {
  const { courts, indoor, outdoor } = stats(d);
  const parts = [`${d.city} compte ${plural(d.clubs.length, "club")} de padel${courts ? ` pour ${plural(courts, "terrain")} au total` : ""}, dans la région ${d.region === "Grand Tunis" ? "du Grand Tunis" : `de ${d.region}`}.`];
  if (indoor.length && outdoor.length) parts.push(`${plural(indoor.length, "club")} propose${indoor.length > 1 ? "nt" : ""} des terrains couverts, idéaux l'été et les jours de pluie, et ${outdoor.length} des terrains en plein air.`);
  else if (indoor.length) parts.push("Tous les clubs disposent de terrains couverts.");
  else if (outdoor.length) parts.push("Les terrains sont en plein air.");
  return parts.join(" ");
}

function faq(d: CityData) {
  const { courts, indoor, allNight } = stats(d);
  const biggest = d.clubs.find((c) => c.courts);
  return [
    { q: `Combien y a-t-il de clubs de padel à ${d.city} ?`, a: `${d.city} compte ${plural(d.clubs.length, "club")} de padel${courts ? ` et ${plural(courts, "terrain")}` : ""} : ${names(d.clubs)}.` },
    indoor.length > 0 && { q: `Où jouer au padel en intérieur à ${d.city} ?`, a: `Pour jouer à couvert, rendez-vous chez ${names(indoor)}.` },
    biggest && d.clubs.length > 1 && { q: `Quel est le plus grand club de padel à ${d.city} ?`, a: `${biggest.name} est le club le mieux équipé de ${d.city} avec ${plural(biggest.courts!, "terrain")}.` },
    allNight.length > 0 && { q: `Peut-on jouer au padel la nuit à ${d.city} ?`, a: `Oui : ${names(allNight)} ${allNight.length > 1 ? "sont ouverts" : "est ouvert"} 24h/24.` },
  ].filter(Boolean) as { q: string; a: string }[];
}

export const Route = createFileRoute("/clubs/ville/$city")({
  loader: async ({ params }) => {
    const data = await getCity({ data: { slug: params.city } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const d = loaderData;
    if (!d) return { meta: [{ title: "Ville introuvable | PadelTunisia" }, { name: "robots", content: "noindex" }] };
    const url = absoluteUrl(`/clubs/ville/${params.city}`);
    const { courts } = stats(d);
    const title = `Padel à ${d.city} : ${plural(d.clubs.length, "club")}${courts ? `, ${plural(courts, "terrain")}` : ""} | PadelTunisia`;
    const description = `${intro(d)} Adresses, horaires, téléphones et tournois à ${d.city}.`.slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `Où jouer au padel à ${d.city} ?` },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        // Single-club cities are useful to visitors but too thin for search results.
        ...(d.clubs.length < MIN_CLUBS_FOR_CITY_PAGE ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Clubs de padel à ${d.city}`,
            numberOfItems: d.clubs.length,
            itemListElement: d.clubs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: absoluteUrl(`/clubs/${c.slug}`) })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq(d).map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
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
              { "@type": "ListItem", position: 3, name: d.city, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Ville introuvable</h1>
      <Link to="/clubs" search={{ q: "", city: "" }} className="mt-6 inline-block font-bold text-court">← Tous les clubs</Link>
    </div>
  ),
  component: CityPage,
});

function CityPage() {
  const d = Route.useLoaderData();
  const { courts, indoor, outdoor } = stats(d);
  const facts = [
    { Icon: LayoutGrid, label: "Clubs", value: d.clubs.length },
    { Icon: MapPin, label: "Terrains", value: courts || "—" },
    { Icon: Warehouse, label: "Clubs avec couvert", value: indoor.length },
    { Icon: Sun, label: "Clubs en plein air", value: outdoor.length },
  ];

  return (
    <>
      <header className="court-lines relative bg-court text-court-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:pb-28 sm:pt-10">
          <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm font-semibold text-court-foreground/75">
            <Link to="/" className="hover:text-court-foreground">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/clubs" search={{ q: "", city: "" }} className="hover:text-court-foreground">Clubs</Link>
          </nav>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-lime">{d.region}</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-6xl">Padel à {d.city}</h1>
          <p className="mt-4 max-w-2xl text-lg text-court-foreground/85">{intro(d)}</p>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-lift lg:grid-cols-4">
          {facts.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 bg-card p-3.5 sm:p-5">
              <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-court sm:grid"><Icon className="h-5 w-5" /></span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="font-display text-lg font-bold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <h2 className="mb-6 text-2xl font-bold">Les clubs de padel à {d.city}</h2>
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {d.clubs.map((c) => <ClubCard key={c.slug} club={c} />)}
        </Reveal>
      </section>

      {d.events.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-bold">Tournois à venir à {d.city}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.events.map((e) => <EventCard key={e.slug} e={e} />)}</ul>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-3xl px-4">
        <div className="rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 divide-y">
            {faq(d).map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {d.neighbours.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4">
          <h2 className="mb-4 text-xl font-bold">Ailleurs dans la région {d.region === "Grand Tunis" ? "du Grand Tunis" : `de ${d.region}`}</h2>
          <div className="flex flex-wrap gap-2">
            {d.neighbours.map((n) => (
              <Link key={n} to="/clubs/ville/$city" params={{ city: citySlug(n) }} className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-colors hover:bg-accent">
                Padel à {n}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

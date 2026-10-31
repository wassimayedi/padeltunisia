import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { ChevronDown, MapPin } from "lucide-react";
import { z } from "zod";
import { PageHero } from "@/components/site-chrome";
import { ClubLogo } from "@/components/cards";
import { FreeCourtSearch } from "@/components/free-court-search";
import { searchFreeCourts } from "@/functions/availability";
import { dayLabel, earliestTimeToday, MAX_DAY, SEARCH_TIMES, TIME_TOLERANCE_MIN, upcomingTime } from "@/lib/availability";
import { absoluteUrl, pageTitle, SITE_NAME } from "@/lib/site";

const schema = z
  .object({
    day: fallback(z.number().int().min(0).max(MAX_DAY), 0).default(0),
    time: fallback(z.enum(SEARCH_TIMES as [string, ...string[]]), "19:00").default("19:00"),
    city: fallback(z.string(), "").default(""),
  })
  // A time already past today moves to the next one, before any planning is fetched for it.
  .transform((s) => ({ ...s, time: upcomingTime(s.day, s.time, earliestTimeToday()) }));

const faq = [
  {
    q: "Comment trouver un terrain de padel libre ?",
    a: "Choisissez une ville, un jour et une heure : la page vérifie les plannings en ligne des clubs et affiche ceux qui ont au moins un terrain libre dans la demi-heure autour de l'heure choisie, avec l'horaire exact de chaque terrain.",
  },
  {
    q: "Les disponibilités sont-elles en temps réel ?",
    a: "Presque : les plannings des clubs sont relus toutes les 5 minutes au plus. Un créneau peut donc partir entre-temps ; seule la réservation auprès du club fait foi.",
  },
  {
    q: "Comment réserver le créneau trouvé ?",
    a: `Ouvrez la fiche du club, puis son site de réservation (bouton « Réserver »), ou appelez le club. ${SITE_NAME} affiche les terrains libres mais ne prend pas de réservation.`,
  },
  {
    q: "Pourquoi tous les clubs ne sont-ils pas listés ?",
    a: "Seuls les clubs qui publient leur planning en ligne peuvent être vérifiés. Les autres se réservent par téléphone : retrouvez-les dans l'annuaire des clubs de padel.",
  },
];

export const Route = createFileRoute("/terrains")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams({ city: "" })] },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => searchFreeCourts({ data: deps }),
  head: () => {
    const url = absoluteUrl("/terrains");
    const desc = "Trouvez un terrain de padel libre à Tunis, Sousse, Hammamet ou Monastir : choisissez un jour et une heure, voyez les clubs qui ont un terrain disponible.";
    return {
      meta: [
        { title: pageTitle("Terrain de padel libre à Tunis, Sousse, Hammamet — Disponibilités") },
        { name: "description", content: desc },
        { property: "og:title", content: "Trouver un terrain de padel libre en Tunisie" },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Terrains libres", item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          }),
        },
      ],
    };
  },
  component: TerrainsPage,
});

function TerrainsPage() {
  const { day, time, city } = Route.useSearch();
  const { clubs, checked, cityGroups, readable } = Route.useLoaderData();
  // Clubs whose planning we read, by city, for the static list below the results.
  const byCity = new Map<string, typeof readable>();
  for (const c of readable) byCity.set(c.city, [...(byCity.get(c.city) ?? []), c]);
  const navigate = useNavigate({ from: "/terrains" });
  return (
    <>
      <PageHero eyebrow="Disponibilités" title="Trouver un terrain libre" intro="Choisissez un jour et une heure : on vérifie les plannings publics des clubs et on vous montre ceux qui ont au moins un terrain libre." />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-16">
        <FreeCourtSearch value={{ day, time, city }} cityGroups={cityGroups} onChange={(search) => navigate({ search, replace: true, resetScroll: false })} />

        <p className="mt-6 text-sm font-semibold text-muted-foreground" aria-live="polite">
          {clubs.length} club{clubs.length > 1 ? "s" : ""} avec un terrain libre{city && ` à ${city}`} · {dayLabel(day).toLowerCase()} vers {time} (± {TIME_TOLERANCE_MIN} min)
        </p>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map(({ club, courts }) => (
            <li key={club.slug}>
              <Link to="/clubs/$slug" params={{ slug: club.slug }} className="flex h-full flex-col rounded-3xl border bg-card p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <ClubLogo club={club} className="h-12 w-12 rounded-lg text-base" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{club.name}</h2>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{club.city}</p>
                  </div>
                </div>
                <ul className="mt-4 grid gap-2">
                  {courts.map(({ court, starts }) => (
                    <li key={court} className="flex items-baseline justify-between gap-4 rounded-xl bg-muted px-4 py-2.5 text-sm">
                      <span className="truncate font-semibold">{court}</span>
                      <span className="shrink-0 font-bold tabular-nums text-court">{starts.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
        {clubs.length === 0 && <p className="py-16 text-center text-muted-foreground">Aucun terrain libre à cette heure. Essayez un autre créneau.</p>}

        <p className="mt-10 text-xs text-muted-foreground">
          Plannings en ligne lus pour {checked} club{checked > 1 ? "s" : ""}{city && ` à ${city}`}, mis à jour toutes les 5 minutes : un terrain peut partir entre-temps. Les autres clubs se réservent par téléphone,{" "}
          <Link to="/clubs" search={{ q: "", city: "" }} className="font-semibold text-court underline">voir l'annuaire</Link>.
        </p>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Clubs dont les disponibilités sont vérifiées</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            La recherche ne couvre que les clubs qui rendent publics leurs créneaux disponibles en ligne. Leurs terrains libres apparaissent ci-dessus ; les autres clubs se réservent par téléphone.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...byCity].map(([name, list]) => (
              <div key={name} className="rounded-3xl border bg-card p-5">
                <h3 className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-court" />{name}</h3>
                <ul className="mt-3 grid gap-1">
                  {list.map((c) => (
                    <li key={c.slug}>
                      <Link to="/clubs/$slug" params={{ slug: c.slug }} className="text-sm font-semibold text-court hover:underline">{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <aside className="mt-8 flex flex-col gap-4 rounded-3xl bg-navy p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-bold">Votre club n'apparaît pas ici ?</h2>
            <p className="mt-1 max-w-xl text-primary-foreground/80">Si votre club publie ses créneaux en ligne (Balle Jaune, PadUp ou votre propre site), contactez-nous : on ajoute vos terrains libres à la recherche, gratuitement.</p>
          </div>
          <Link to="/contact" search={{ sujet: "club", club: "" }} className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-lime px-6 font-bold text-navy transition-transform active:scale-95">
            Nous contacter →
          </Link>
        </aside>

        <section className="mt-12 rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 divide-y">
            {faq.map(({ q, a }) => (
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
    </>
  );
}

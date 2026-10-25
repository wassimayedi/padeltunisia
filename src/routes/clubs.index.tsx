import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHero } from "@/components/site-chrome";
import { ClubSearch } from "@/components/club-search";
import { ClubCard } from "@/components/cards";
import { getClubDirectory } from "@/functions/clubs";
import { citySlug, filterClubs, MIN_CLUBS_FOR_CITY_PAGE } from "@/lib/clubs";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/clubs/")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "Clubs de padel en Tunisie — Annuaire par ville | PadelTunisia" },
      { name: "description", content: "Plus de 50 clubs de padel en Tunisie : Grand Tunis, Sfax, Sousse, Monastir, Hammamet, Djerba, Gabès… Recherchez par nom ou par ville." },
      { property: "og:title", content: "Clubs de padel en Tunisie" },
      { property: "og:description", content: "L'annuaire complet des clubs de padel tunisiens, par ville." },
    ],
    links: [{ rel: "canonical", href: "/clubs" }],
  }),
  loader: () => getClubDirectory(),
  // Typing in the search only changes URL params; keep the loaded directory instead of refetching per keystroke.
  staleTime: 5 * 60_000,
  component: ClubsPage,
});

function ClubsPage() {
  const { q, city } = Route.useSearch();
  const { clubs, cityGroups } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/clubs/" });
  const list = filterClubs(clubs, q, city);
  // Cities big enough for their own indexed page, largest first.
  const counts = new Map<string, number>();
  for (const c of clubs) counts.set(c.city, (counts.get(c.city) ?? 0) + 1);
  const cityPages = [...counts].filter(([, n]) => n >= MIN_CLUBS_FOR_CITY_PAGE).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return (
    <>
      <PageHero eyebrow="Annuaire" title="Clubs de padel en Tunisie" intro="Recherchez un club par nom ou par ville et découvrez terrains, localisation et réseaux." />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4">
        <ClubSearch q={q} city={city} cityGroups={cityGroups} onChange={(v) => navigate({ search: v, replace: true, resetScroll: false })} />
        <p className="mt-6 text-sm font-semibold text-muted-foreground" aria-live="polite">{list.length} club{list.length > 1 ? "s" : ""}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c.slug} className="animate-in fade-in zoom-in-95 duration-300"><ClubCard club={c} /></div>
          ))}
        </div>
        {list.length === 0 && <p className="py-16 text-center text-muted-foreground">Aucun club trouvé.</p>}
        <nav aria-label="Padel par ville" className="mt-16">
          <h2 className="mb-4 text-xl font-bold">Padel par ville</h2>
          <div className="flex flex-wrap gap-2">
            {cityPages.map(([name, n]) => (
              <Link key={name} to="/clubs/ville/$city" params={{ city: citySlug(name) }} className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-colors hover:bg-accent">
                Padel à {name} <span className="opacity-60">{n}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}

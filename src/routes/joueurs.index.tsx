import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { CheckCircle2, ChevronDown, Lock, Plus, RotateCcw, SearchX, SlidersHorizontal, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { clubOption } from "@/components/availability-form";
import { CityOptions } from "@/components/city-options";
import { GoogleButton } from "@/components/login-button";
import { PlayerCard } from "@/components/player-card";
import { PageHero } from "@/components/site-chrome";
import { getClubChoices } from "@/functions/matches";
import { getAvailablePlayers } from "@/functions/players";
import { cityGroups, inArea } from "@/lib/clubs";
import { LEVELS, MAX_LEVEL, TIMEZONE } from "@/lib/matches";
import { AVAILABILITY_DAYS, PLAYER_GENDERS, playerGenderLabel, type MyAvailability } from "@/lib/players";
import { absoluteUrl, pageTitle } from "@/lib/site";

const defaults = { club: "", page: 1 } as const;

// City, level and gender stay out of the URL until changed: the server then uses the viewer's
// profile. Choosing "all" keeps an explicit "" or 0 in the URL so the profile doesn't come back.
const schema = z.object({
  city: fallback(z.string().optional(), undefined),
  club: fallback(z.string(), "").default(""),
  level: fallback(z.number().int().min(0).max(MAX_LEVEL).optional(), undefined),
  gender: fallback(z.enum(["", "male", "female"]).optional(), undefined),
  page: fallback(z.number().int().min(1), 1).default(1),
});

const faq = [
  {
    q: "Comment trouver un partenaire de padel disponible ?",
    a: "Connectez-vous, puis filtrez par ville, niveau et genre : la liste montre les joueurs qui se sont déclarés disponibles pour jouer, et vous pouvez les contacter directement sur WhatsApp.",
  },
  {
    q: "Comment apparaître dans la liste ?",
    a: `Complétez votre profil (téléphone, genre, niveau), puis cliquez sur « Me rendre disponible ». Vous restez visible ${AVAILABILITY_DAYS} jours, et pouvez prolonger ou arrêter à tout moment.`,
  },
  {
    q: "Puis-je rester anonyme ?",
    a: "Oui : en mode anonyme, votre nom et votre photo sont masqués ; seuls votre niveau, votre genre et votre ville s'affichent. Les membres qui vous contactent voient votre numéro sur WhatsApp.",
  },
];

export const Route = createFileRoute("/joueurs/")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams(defaults)] },
  loaderDeps: ({ search }) => search,
  // Visitors get null (server-side check in getAvailablePlayers) and a login card instead of the list.
  loader: async ({ deps }) => {
    const result = await getAvailablePlayers({ data: deps });
    return { result, clubs: result ? await getClubChoices() : [] };
  },
  head: () => {
    const url = absoluteUrl("/joueurs");
    const desc = "Joueurs de padel disponibles pour jouer en Tunisie : trouvez un partenaire à votre niveau à Tunis, Sousse, Hammamet ou Sfax et contactez-le sur WhatsApp.";
    return {
      meta: [
        { title: pageTitle("Joueurs de padel disponibles en Tunisie") },
        { name: "description", content: desc },
        { property: "og:title", content: "Trouver un partenaire de padel disponible" },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
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
  component: PlayersPage,
});

function PlayersPage() {
  const { result, clubs } = Route.useLoaderData();
  return (
    <>
      <PageHero eyebrow="Joueurs disponibles" title="Qui est dispo pour jouer ?" intro="Des joueurs de votre niveau partants pour un match : filtrez par ville, club et niveau, puis contactez-les directement sur WhatsApp." />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-16">
        {result ? <PlayersList result={result} clubs={clubs} /> : <LoginGate />}

        <section className="mt-16 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <dl className="mt-4 grid gap-5">
            {faq.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-bold">{q}</dt>
                <dd className="mt-1 text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}

type ListData = NonNullable<Awaited<ReturnType<typeof getAvailablePlayers>>>;
type ClubList = Awaited<ReturnType<typeof getClubChoices>>;

/** Filters, list and pages: only rendered for logged-in players. */
function PlayersList({ result, clubs }: { result: ListData; clubs: ClubList }) {
  const search = Route.useSearch();
  const { players, hasMore, filters } = result;
  const navigate = useNavigate({ from: "/joueurs/" });
  // From the loader, not a browser query: no flash of the wrong button or card on first paint.
  const viewer = result.me;
  const filter = (patch: Partial<typeof search>) => navigate({ search: (s) => ({ ...s, ...patch, page: 1 }), replace: true, resetScroll: false });
  const select = "h-12 w-full cursor-pointer appearance-none rounded-2xl bg-muted pl-4 pr-10 font-semibold text-foreground outline-none";
  // Phones and tablets: the availability button on its own row, then the four selects folded behind a
  // "Filtres" button so the players stay on screen.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const active = [filters.city, search.club, filters.level, filters.gender].filter(Boolean).length;
  return (
    <>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-2 rounded-3xl bg-card p-2 shadow-lift lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="player-filters" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted px-4 font-semibold lg:hidden">
            <SlidersHorizontal className="h-5 w-5" />Filtres
            {active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-court px-1.5 text-xs font-bold text-court-foreground">{active}</span>}
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          <AvailabilityButton mine={viewer.availability} />
          {/* lg:contents: on large screens the selects sit directly in the 5-column grid. */}
          <div id="player-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-2 sm:grid-cols-2 lg:contents`}>
          <Field label="Ville">
            {/* A club picked in another city would leave the list empty: changing city resets it. */}
            <select value={filters.city} onChange={(e) => filter({ city: e.target.value, club: "" })} className={select}>
              <option value="">Toutes les villes</option>
              <CityOptions groups={cityGroups(clubs)} />
            </select>
          </Field>
          <Field label="Club">
            <select value={search.club} onChange={(e) => filter({ club: e.target.value })} className={select}>
              <option value="">Tous les clubs</option>
              {clubs
                .filter((c) => inArea(filters.city, c))
                .map((c, _, list) => <option key={c.slug} value={c.slug}>{clubOption(c, list)}</option>)}
            </select>
          </Field>
          <Field label="Niveau">
            <select value={filters.level} onChange={(e) => filter({ level: Number(e.target.value) })} className={select}>
              <option value={0}>Tous niveaux</option>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>Niveau {l.value} (±1)</option>)}
            </select>
          </Field>
          <Field label="Genre">
            <select value={filters.gender} onChange={(e) => filter({ gender: e.target.value as typeof filters.gender })} className={select}>
              <option value="">Tous</option>
              {PLAYER_GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}s</option>)}
            </select>
          </Field>
          </div>
        </form>

        {viewer.level && (filters.level !== viewer.level || filters.gender !== (viewer.gender ?? "") || filters.city !== (viewer.city ?? "")) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-court/20 bg-court/5 px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 shrink-0 text-court" />
              <span>
                <span className="text-muted-foreground">Mes critères : </span>
                <span className="font-semibold">{[`Niveau ${viewer.level}`, viewer.gender && playerGenderLabel(viewer.gender), viewer.city].filter(Boolean).join(" · ")}</span>
              </span>
            </p>
            <button onClick={() => filter({ level: undefined, gender: undefined, city: undefined, club: "" })} className="flex h-9 items-center gap-1.5 rounded-full bg-court px-4 text-sm font-bold text-court-foreground hover:opacity-90">
              <RotateCcw className="h-4 w-4" />Revenir à mes critères
            </button>
          </div>
        )}


        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => <li key={p.id}><PlayerCard player={p} mine={viewer.id === p.id} /></li>)}
        </ul>
        {players.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-court/10 text-court"><SearchX className="h-7 w-7" /></span>
            <h2 className="mt-4 text-xl font-bold">Aucun joueur disponible pour ces critères</h2>
            <p className="mt-2 max-w-md text-muted-foreground">Rendez-vous disponible : les joueurs de votre niveau pourront vous contacter. Ou cherchez un <Link to="/matchs" className="font-semibold text-court underline">match ouvert</Link>.</p>
          </div>
        )}
        {(search.page > 1 || hasMore) && (
          <nav className="mt-8 flex justify-center gap-3" aria-label="Pages">
            {search.page > 1 && <Link from="/joueurs/" search={(s) => ({ ...s, page: s.page - 1 })} className="rounded-full border px-5 py-2 font-semibold">Précédents</Link>}
            {hasMore && <Link from="/joueurs/" search={(s) => ({ ...s, page: s.page + 1 })} className="rounded-full border px-5 py-2 font-semibold">Suivants</Link>}
          </nav>
        )}
    </>
  );
}

/** What visitors see instead of the list: the players' names and clubs are for members only. */
function LoginGate() {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-card px-6 py-10 text-center shadow-lift">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-court/10 text-court"><Lock className="h-7 w-7" /></span>
      <h2 className="mt-4 text-xl font-bold">Connectez-vous pour voir les joueurs disponibles</h2>
      <p className="mt-2 max-w-md text-muted-foreground">Pour protéger la vie privée des joueurs, la liste est réservée aux membres. La connexion se fait avec Google, en un clic.</p>
      <GoogleButton next="/joueurs" className="mt-6 w-full sm:w-auto" />
    </div>
  );
}

const shortDay = (d: Date) => new Intl.DateTimeFormat("fr-TN", { weekday: "short", day: "numeric", month: "short", timeZone: TIMEZONE }).format(d);

/**
 * The filter bar's call to action, like "Créer un match" on /matchs. It always opens /joueurs/disponible,
 * which sends visitors to log in and incomplete profiles to /profil; saving there extends by
 * AVAILABILITY_DAYS and "Ne plus être disponible" lives there too. The state loads in the browser,
 * so the list stays cacheable.
 */
function AvailabilityButton({ mine }: { mine: MyAvailability }) {
  const until = mine.availableUntil;
  return (
    <Link
      to="/joueurs/disponible"
      title={until ? `Disponible jusqu'au ${shortDay(new Date(until))}` : undefined}
      // Two colours so the state reads at a glance: blue = the action, lime = "you are listed".
      className={`flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 font-bold transition-[filter] hover:brightness-95 order-first lg:order-last lg:px-5 ${until ? "bg-lime text-navy" : "bg-court text-court-foreground"}`}
    >
      {until ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <Plus className="h-5 w-5 shrink-0" />}
      {until ? "Disponible · Modifier" : "Me rendre disponible"}
    </Link>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      {children}
      <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}

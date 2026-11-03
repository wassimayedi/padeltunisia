import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { ChevronDown, Plus, RotateCcw, SearchX, UserRound } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { z } from "zod";

import { viewerQuery } from "@/components/login-button";
import { CityOptions } from "@/components/city-options";
import { MatchCard } from "@/components/match-card";
import { PageHero } from "@/components/site-chrome";
import { getMatches } from "@/functions/matches";
import { cityGroups } from "@/lib/clubs";
import { DATE_FILTERS, dateFilterSchema, formatMatchDay, GENDERS, genderLabel, LEVELS, MAX_LEVEL, tunisDate, tunisInstant } from "@/lib/matches";
import { absoluteUrl, pageTitle } from "@/lib/site";

const defaults = { date: "", page: 1 } as const;

// City, level and gender stay out of the URL until changed: the server then uses the viewer's
// profile. Choosing "all" keeps an explicit "" or 0 in the URL so the profile doesn't come back.
const schema = z.object({
  city: fallback(z.string().optional(), undefined),
  date: fallback(dateFilterSchema, "").default(""),
  level: fallback(z.number().int().min(0).max(MAX_LEVEL).optional(), undefined),
  gender: fallback(z.enum(["", "male", "female", "mixed"]).optional(), undefined),
  page: fallback(z.number().int().min(1), 1).default(1),
});

const faq = [
  {
    q: "Comment trouver des joueurs de padel de mon niveau ?",
    a: "Indiquez votre niveau de 1 à 8 dans votre profil, puis filtrez les matchs : chaque organisateur fixe une fourchette de niveaux (par exemple 3 à 5) et seuls les joueurs dans cette fourchette peuvent demander à rejoindre.",
  },
  {
    q: "Comment rejoindre un match ?",
    a: "Ouvrez le match et envoyez une demande. L'organisateur l'accepte ou la refuse ; vous êtes prévenu sur WhatsApp et par e-mail, et ses coordonnées s'affichent une fois accepté.",
  },
  {
    q: "Le terrain est-il réservé ?",
    a: "L'organisateur indique s'il a déjà réservé le terrain. Sinon, il s'en charge auprès du club une fois le match complet ; consultez les terrains libres pour trouver un créneau.",
  },
];

export const Route = createFileRoute("/matchs/")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams(defaults)] },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getMatches({ data: deps }),
  head: () => {
    const url = absoluteUrl("/matchs");
    const desc = "Cherchez un partenaire de padel ou un match à votre niveau en Tunisie : des joueurs cherchent un 4e à Tunis, La Marsa, Sousse, Hammamet ou Monastir.";
    return {
      meta: [
        { title: pageTitle("Trouver un match ou un partenaire de padel en Tunisie") },
        { name: "description", content: desc },
        { property: "og:title", content: "Trouver un match de padel à votre niveau" },
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
  component: MatchesPage,
});

function MatchesPage() {
  const search = Route.useSearch();
  const { matches, hasMore, clubs, filters } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/matchs/" });
  const { data: viewer } = useQuery(viewerQuery);
  const filter = (patch: Partial<typeof search>) => navigate({ search: (s) => ({ ...s, ...patch, page: 1 }), replace: true, resetScroll: false });
  const select = "h-12 w-full cursor-pointer appearance-none rounded-2xl bg-muted pl-4 pr-10 font-semibold text-foreground outline-none";
  return (
    <>
      <PageHero eyebrow="Trouver un match" title="Trouvez des partenaires de padel" intro="Rejoignez un match qui cherche des joueurs dans votre fourchette de niveau, ou créez le vôtre et laissez les joueurs venir à vous." />
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-16">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-2 rounded-3xl bg-card p-2 shadow-lift sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <Field label="Ville">
            <select value={filters.city} onChange={(e) => filter({ city: e.target.value })} className={select}>
              <CityOptions groups={cityGroups(clubs)} />
            </select>
          </Field>
          <Field label="Date">
            <DateSelect value={search.date} onChange={(date) => filter({ date })} className={select} />
          </Field>
          <Field label="Niveau">
            <select value={filters.level} onChange={(e) => filter({ level: Number(e.target.value) })} className={select}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>Niveau {l.value}</option>)}
            </select>
          </Field>
          <Field label="Joueurs">
            <select value={filters.gender} onChange={(e) => filter({ gender: e.target.value as typeof filters.gender })} className={select}>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Link to="/matchs/creer" search={{ city: filters.city }} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-court px-5 font-bold text-court-foreground sm:col-span-2 lg:col-span-1">
            <Plus className="h-5 w-5" />Créer un match
          </Link>
        </form>

        {viewer?.level && (filters.level !== viewer.level || filters.gender !== (viewer.gender ?? "") || filters.city !== (viewer.city ?? "")) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-court/20 bg-court/5 px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 shrink-0 text-court" />
              <span>
                <span className="text-muted-foreground">Mes critères : </span>
                <span className="font-semibold">{[`Niveau ${viewer.level}`, viewer.gender && genderLabel(viewer.gender), viewer.city].filter(Boolean).join(" · ")}</span>
              </span>
            </p>
            <button onClick={() => filter({ level: undefined, gender: undefined, city: undefined })} className="flex h-9 items-center gap-1.5 rounded-full bg-court px-4 text-sm font-bold text-court-foreground hover:opacity-90">
              <RotateCcw className="h-4 w-4" />Revenir à mes critères
            </button>
          </div>
        )}

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => <li key={m.id}><MatchCard match={m} /></li>)}
        </ul>
        {matches.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-court/10 text-court"><SearchX className="h-7 w-7" /></span>
            <h2 className="mt-4 text-xl font-bold">Aucun match pour vos critères actuellement</h2>
            <p className="mt-2 max-w-md text-muted-foreground">Créez votre match : les joueurs de votre niveau le verront et pourront vous rejoindre.</p>
            <Link to="/matchs/creer" search={{ city: filters.city }} className="mt-6 flex h-11 items-center gap-2 rounded-full bg-court px-5 font-bold text-court-foreground hover:opacity-90">
              <Plus className="h-5 w-5" />Créer votre match
            </Link>
          </div>
        )}
        {(search.page > 1 || hasMore) && (
          <nav className="mt-8 flex justify-center gap-3" aria-label="Pages">
            {search.page > 1 && <Link from="/matchs/" search={(s) => ({ ...s, page: s.page - 1 })} className="rounded-full border px-5 py-2 font-semibold">Précédents</Link>}
            {hasMore && <Link from="/matchs/" search={(s) => ({ ...s, page: s.page + 1 })} className="rounded-full border px-5 py-2 font-semibold">Suivants</Link>}
          </nav>
        )}

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
          <p className="mt-6 text-sm text-muted-foreground">
            Besoin d'un terrain ? <Link to="/terrains" className="font-semibold text-court underline">Voir les terrains libres</Link>.
          </p>
        </section>
      </div>

    </>
  );
}

const PICK = "pick";

/** The date presets plus "Choisir une date…", which opens the browser's date picker. */
function DateSelect({ value, onChange, className }: { value: string; onChange: (date: string) => void; className: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const custom = !DATE_FILTERS.some((d) => d.value === value);
  const pick = () => {
    const input = picker.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  };
  return (
    <>
      <select value={value} onChange={(e) => (e.target.value === PICK ? pick() : onChange(e.target.value))} className={className}>
        {DATE_FILTERS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        {custom && <option value={value}>{formatMatchDay(tunisInstant(value, "12:00"))}</option>}
        <option value={PICK}>{custom ? "Changer de date…" : "Choisir une date…"}</option>
      </select>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        min={tunisDate(new Date())}
        value={custom ? value : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0"
      />
    </>
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

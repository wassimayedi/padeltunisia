import { createFileRoute, Link } from "@tanstack/react-router";
import { Hero } from "@/components/hero";
import { Reveal } from "@/components/motion";
import { ArticleCard, ClubCard, EventCard, NewsCard } from "@/components/cards";
import { getHomeClubs } from "@/functions/clubs";
import { getEvents } from "@/functions/events";
import { getArticles } from "@/functions/magazine";
import { getNews } from "@/functions/news";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PadelTunisia — Clubs de padel en Tunisie, tournois et actualités" },
      { name: "description", content: "Trouvez un club de padel à Tunis, Sousse, Hammamet, Djerba… Actualités, tournois tunisiens et internationaux, guides pour progresser." },
      { property: "og:title", content: "PadelTunisia — Le padel en Tunisie" },
      { property: "og:description", content: "Annuaire des clubs, événements et actualités du padel tunisien et international." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: async () => {
    const [clubs, upcoming, news, articles] = await Promise.all([
      getHomeClubs(),
      getEvents({ data: { limit: 4, tunisiaFirst: true } }),
      getNews({ data: { limit: 3 } }),
      getArticles({ data: { limit: 3 } }),
    ]);
    return { ...clubs, upcoming, news, articles };
  },
  component: Index,
});

function SectionHead({ k, title, to, cta }: { k: string; title: string; to: "/clubs" | "/articles" | "/evenements"; cta: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-court">{k}</p>
        <h2 className="mt-2 text-3xl font-extrabold sm:text-5xl">{title}</h2>
      </div>
      <Link to={to} className="shrink-0 rounded-full border px-4 py-2 text-sm font-bold hover:bg-secondary">{cta}</Link>
    </div>
  );
}

function Index() {
  const { featured, stats, cityGroups, upcoming, news, articles } = Route.useLoaderData();
  const cities = cityGroups.flatMap((g) => g.cities);
  return (
    <>
      <Hero stats={stats} cityGroups={cityGroups} />

      <div className="overflow-hidden border-y bg-navy py-4 text-primary-foreground" aria-hidden>
        <div className="marquee flex w-max gap-10 font-display text-2xl font-extrabold">
          {/* Two identical halves so the -50% scroll loops seamlessly */}
          {[...cities, ...cities].map((c, i) => (
            <span key={i} className="flex items-center gap-10">{c}<span className="h-3 w-3 rounded-full bg-lime" /></span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <SectionHead k="Annuaire" title="Clubs à la une" to="/clubs" cta="Tous les clubs" />
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => <ClubCard key={c.slug} club={c} />)}
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <SectionHead k="Agenda" title="Prochains événements" to="/evenements" cta="Calendrier" />
        <Reveal as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((e) => <EventCard key={e.slug} e={e} />)}
        </Reveal>
      </section>

      {articles.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24">
          <SectionHead k="Le magazine" title="À lire" to="/articles" cta="Tous les articles" />
          <Reveal className="grid gap-4 md:grid-cols-3">
            {articles.map((a) => <ArticleCard key={a.slug} a={a} />)}
          </Reveal>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <SectionHead k="Le fil" title="Actualités" to="/articles" cta="Toute l'actu" />
        <Reveal as="ul" className="grid gap-4 md:grid-cols-3">
          {news.map((n) => <NewsCard key={n.id} n={n} />)}
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <Reveal className="court-lines relative overflow-hidden rounded-[2rem] bg-court p-8 text-court-foreground sm:p-14">
          <h2 data-reveal className="max-w-2xl text-3xl font-extrabold sm:text-5xl">Nouveau au padel ? Apprenez les règles en 5 minutes.</h2>
          <Link data-reveal to="/guide" className="mt-8 inline-flex h-12 items-center rounded-full bg-lime px-6 font-bold text-navy">Lire le guide</Link>
          <span aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-lime/90" />
        </Reveal>
      </section>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Send } from "lucide-react";
import { Hero } from "@/components/hero";
import { Reveal } from "@/components/motion";
import { ArticleCard, ClubCard, EventCard, NewsCard } from "@/components/cards";
import { getHomeClubs } from "@/functions/clubs";
import { getEvents } from "@/functions/events";
import { getArticles } from "@/functions/magazine";
import { getNews } from "@/functions/news";
import { absoluteUrl, CONTACT_EMAIL, CONTACT_PHONE_TEL } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PadelTunisia — Clubs de padel en Tunisie, tournois et actualités" },
      { name: "description", content: "Trouvez un club de padel à Tunis, Sousse, Hammamet, Djerba… Actualités, tournois tunisiens et internationaux, guides pour progresser." },
      { property: "og:title", content: "PadelTunisia — Le padel en Tunisie" },
      { property: "og:description", content: "Annuaire des clubs, événements et actualités du padel tunisien et international." },
      // Bing Webmaster Tools ownership check: keep it, removing it cancels the verification.
      { name: "msvalidate.01", content: "56A9CACFBC0FEE251ADCFFEDD628EE1D" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
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
  const { featured, stats, cityGroups, upcoming, news, articles, logos } = Route.useLoaderData();
  return (
    <>
      <Hero stats={stats} cityGroups={cityGroups} />

      <nav aria-label="Clubs de l'annuaire" className="group/marquee overflow-hidden border-y bg-navy py-4">
        {/* Two identical halves so the -50% scroll loops seamlessly; the copy is hidden from
            assistive tech and keyboard. Pauses on hover so a logo can be clicked. */}
        <div className="marquee flex w-max group-hover/marquee:[animation-play-state:paused]" style={{ animationDuration: `${logos.length * 1.6}s` }}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-center gap-6 pr-6">
              {logos.map((c) => (
                <li key={c.slug}>
                  <Link to="/clubs/$slug" params={{ slug: c.slug }} tabIndex={copy === 1 ? -1 : undefined} title={c.name} className="block rounded-xl transition-transform hover:scale-110">
                    <img src={c.logoUrl} alt={copy === 0 ? c.name : ""} width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 rounded-xl bg-white object-cover" />
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </nav>

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

      {/* Visitors look for contact at the end of the home page. */}
      <section id="contact" className="mx-auto max-w-6xl px-4 pt-16">
        <Reveal className="grid gap-8 rounded-[2rem] border bg-card p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div data-reveal>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-court">Contact</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Un club à ajouter, un tournoi à annoncer, une question ?</h2>
            <p className="mt-3 text-muted-foreground">Écrivez-nous : on met à jour l'annuaire et le calendrier rapidement.</p>
          </div>
          <div data-reveal className="grid gap-3">
            <Link to="/contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">
              <Send className="h-4 w-4" />Nous écrire
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <a href={`https://wa.me/${CONTACT_PHONE_TEL.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-sm font-bold text-secondary-foreground transition-colors hover:bg-accent">
                <MessageCircle className="h-4 w-4" />WhatsApp
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-sm font-bold text-secondary-foreground transition-colors hover:bg-accent">
                <Mail className="h-4 w-4" />E-mail
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

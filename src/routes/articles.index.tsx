import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/site-chrome";
import { Reveal } from "@/components/motion";
import { ArticleCard, NewsCard } from "@/components/cards";
import { getArticles } from "@/functions/magazine";
import { getNews } from "@/functions/news";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/articles/")({
  loader: async () => {
    const [articles, news] = await Promise.all([getArticles(), getNews()]);
    return { articles, news };
  },
  head: () => ({
    meta: [
      { title: "Actualités padel Tunisie et international | PadelTunisia" },
      { name: "description", content: "Toute l'actualité du padel : étapes FTT et équipe de Tunisie, circuit FIP et Premier Padel, plus nos articles et guides." },
      { property: "og:title", content: "Actualités du padel — PadelTunisia" },
      { property: "og:description", content: "Actualités du padel en Tunisie et dans le monde." },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/articles") }],
  }),
  component: NewsPage,
});

const tabs = [
  { key: "all", label: "Tout" },
  { key: "tn", label: "Tunisie" },
  { key: "int", label: "International" },
] as const;

function NewsPage() {
  const { articles, news } = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const list = news.filter((n) => tab === "all" || n.scope === tab);

  return (
    <>
      <PageHero eyebrow="Actualités" title="Actualités du padel" intro="Nos articles sur le padel tunisien et international, et le fil de l'actu du circuit." />

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <h2 className="mb-6 text-2xl font-bold sm:text-3xl">Le magazine</h2>
        <Reveal className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => <ArticleCard key={a.slug} a={a} eager={i === 0} />)}
        </Reveal>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Fil d'actualité</h2>
          <div className="flex gap-2 overflow-x-auto" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <ul key={tab} className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 md:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => <NewsCard key={n.id} n={n} />)}
        </ul>
      </section>
    </>
  );
}

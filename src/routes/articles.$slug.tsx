import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/cards";
import { Reveal } from "@/components/motion";
import { getArticle } from "@/functions/magazine";
import { articleDate } from "@/lib/magazine";
import { absoluteUrl, pageTitle } from "@/lib/site";

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const data = await getArticle({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: "Article introuvable | PadelTunisia" }, { name: "robots", content: "noindex" }] };
    const url = absoluteUrl(`/articles/${params.slug}`);
    const title = a.metaTitle ?? a.title;
    const description = a.metaDescription ?? a.excerpt;
    const image = a.imageUrl ? absoluteUrl(a.imageUrl) : undefined;
    const modified = new Date(a.updatedAt).toISOString();
    return {
      meta: [
        { title: pageTitle(title) },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }] : []),
        ...(a.imageAlt ? [{ property: "og:image:alt", content: a.imageAlt }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { property: "article:published_time", content: a.publishedOn },
        { property: "article:modified_time", content: modified },
        { property: "article:section", content: a.category },
        ...a.keywords.map((k) => ({ property: "article:tag", content: k })),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            // Guides are evergreen; the other categories report news.
            "@type": a.category === "Guide" ? "Article" : "NewsArticle",
            headline: a.title,
            description,
            image: image ? [image] : undefined,
            datePublished: a.publishedOn,
            dateModified: modified,
            inLanguage: "fr",
            articleSection: a.category,
            keywords: a.keywords.join(", "),
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "PadelTunisia", url: absoluteUrl("/") },
            publisher: { "@type": "Organization", name: "PadelTunisia", logo: { "@type": "ImageObject", url: absoluteUrl("/logo.webp") } },
            citation: a.sources.map((s) => ({ "@type": "CreativeWork", name: s.label, url: s.url })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Actualités", item: absoluteUrl("/articles") },
              { "@type": "ListItem", position: 3, name: a.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Article introuvable</h1>
      <Link to="/articles" className="mt-6 inline-block font-bold text-court">← Retour aux actualités</Link>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article: a, more } = Route.useLoaderData();
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm font-semibold text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/articles" className="hover:text-foreground">Actualités</Link>
        </nav>

        <header className="mt-6">
          <span className="inline-block rounded-full bg-lime px-3 py-1 text-xs font-bold text-navy">{a.category}</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">{a.title}</h1>
          <p className="mt-4 text-sm font-semibold text-muted-foreground">
            Par la rédaction PadelTunisia · <time dateTime={a.publishedOn}>{articleDate(a.publishedOn)}</time> · {a.readingMinutes} min de lecture
          </p>
        </header>

        {a.imageUrl && (
          <figure className="mt-8">
            <img src={a.imageUrl} alt={a.imageAlt ?? ""} width={1200} height={630} className="aspect-[1200/630] w-full rounded-3xl object-cover shadow-lift" />
            {/* Stock covers: Pixabay asks to show where the photo comes from. */}
            {a.imageCredit && (
              <figcaption className="mt-2 text-right text-xs text-muted-foreground">
                Photo :{" "}
                <a href={a.imageCredit.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  {a.imageCredit.name}
                </a>{" "}
                sur{" "}
                <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  Pixabay
                </a>
              </figcaption>
            )}
          </figure>
        )}

        <p className="mt-8 text-xl font-medium leading-relaxed">{a.excerpt}</p>
        <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: a.html }} />

        {a.sources.length > 0 && (
          <aside className="mt-12 rounded-3xl border bg-card p-6">
            <h2 className="text-lg font-bold">Sources</h2>
            <ul className="mt-3 grid gap-2">
              {a.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-sm font-semibold text-court hover:underline">
                    {s.label}<ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>

      {more.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-bold">À lire aussi</h2>
          <Reveal className="grid gap-4 md:grid-cols-3">
            {more.map((m) => <ArticleCard key={m.slug} a={m} />)}
          </Reveal>
        </section>
      )}
    </>
  );
}

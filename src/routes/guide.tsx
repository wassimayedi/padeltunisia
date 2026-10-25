import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site-chrome";
import { Reveal } from "@/components/motion";

const faq = [
  { q: "Qu'est-ce que le padel ?", a: "Un sport de raquette qui se joue en double sur un terrain de 20 × 10 m entouré de vitres. Il mélange tennis et squash : les murs font partie du jeu." },
  { q: "Comment se fait le service ?", a: "À la cuillère, sous la ceinture, après un rebond derrière la ligne de service, en diagonale dans le carré adverse." },
  { q: "Comment compte-t-on les points ?", a: "Comme au tennis : 15, 30, 40, jeu. Un set se gagne à 6 jeux avec 2 jeux d'écart, un match en 2 sets gagnants." },
  { q: "Combien coûte une partie en Tunisie ?", a: "Les tarifs varient selon les clubs et les horaires. Une location se partage généralement à quatre joueurs — contactez le club pour ses prix." },
  { q: "Quel matériel faut-il ?", a: "Une raquette de padel, des balles pressurisées et des chaussures à semelle adaptée. La plupart des clubs louent les raquettes." },
];

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide du padel : règles, matériel et conseils | PadelTunisia" },
      { name: "description", content: "Apprenez les règles du padel, le service, le comptage des points et comment choisir votre matériel pour débuter en Tunisie." },
      { property: "og:title", content: "Guide du padel pour débutants" },
      { property: "og:description", content: "Règles, matériel et conseils pour bien commencer le padel." },
    ],
    links: [{ rel: "canonical", href: "/guide" }],
  }),
  component: () => (
    <>
      <PageHero eyebrow="Guide" title="Le padel, simplement" intro="Tout ce qu'il faut savoir pour votre premier match." />
      <Reveal className="mx-auto mt-12 grid max-w-3xl gap-3 px-4">
        {faq.map((f) => (
          <details data-reveal key={f.q} className="group rounded-3xl border bg-card p-6 open:shadow-lift">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
              {f.q}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
        <Link data-reveal to="/clubs" search={{ q: "", city: "" }} className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-bold text-primary-foreground">Trouver un club près de chez moi</Link>
      </Reveal>
    </>
  ),
});

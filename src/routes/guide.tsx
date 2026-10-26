import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site-chrome";
import { Reveal } from "@/components/motion";
import { absoluteUrl, pageTitle } from "@/lib/site";
import { citySlug } from "@/lib/clubs";

type Faq = { q: string; a: string };

// Answers stay plain text: they are also published as FAQPage structured data.
const sections: { title: string; faq: Faq[] }[] = [
  {
    title: "Découvrir le padel",
    faq: [
      {
        q: "Qu'est-ce que le padel ?",
        a: "Un sport de raquette né au Mexique et devenu très populaire en Espagne, puis partout en Europe et au Maghreb. Il se joue presque toujours en double, sur un terrain de 20 × 10 m entouré de vitres et de grillage. Il mélange tennis et squash : après le rebond, la balle peut toucher les murs et rester en jeu.",
      },
      {
        q: "Le padel est-il facile pour débuter ?",
        a: "Oui, c'est l'une de ses grandes forces. Le terrain est petit, la raquette est courte et le service se fait à la cuillère : on échange de vrais points dès la première séance, même sans avoir jamais joué au tennis. Le jeu avec les vitres demande ensuite un peu de pratique, et c'est ce qui le rend vite addictif.",
      },
      {
        q: "Pourquoi joue-t-on à quatre ?",
        a: "Le padel est conçu pour le double : deux joueurs de chaque côté, l'un à droite et l'autre à gauche. C'est plus convivial, on court moins qu'au tennis et la location du terrain se partage à quatre. Quelques clubs ont des terrains « single » plus étroits, mais ils restent rares.",
      },
    ],
  },
  {
    title: "Les règles essentielles",
    faq: [
      {
        q: "Comment se fait le service ?",
        a: "Le serveur fait rebondir la balle derrière la ligne de service, puis la frappe à la cuillère, au niveau de la taille ou en dessous. La balle doit rebondir en diagonale dans le carré de service adverse. Elle peut ensuite toucher la vitre du fond, mais pas le grillage : dans ce cas, c'est une faute. Comme au tennis, on a droit à deux balles de service.",
      },
      {
        q: "Comment compte-t-on les points ?",
        a: "Comme au tennis : 15, 30, 40, jeu. Un set se gagne à 6 jeux avec 2 jeux d'écart, avec un tie-break à 6-6, et un match en 2 sets gagnants. Beaucoup de tournois appliquent le « point en or » : à 40-40, un seul point décisif donne le jeu, et c'est l'équipe qui reçoit qui choisit le côté.",
      },
      {
        q: "Comment fonctionnent les vitres et le grillage ?",
        a: "La balle doit d'abord rebondir au sol dans le camp adverse. Ensuite, elle peut toucher les vitres ou le grillage et rester en jeu : on la joue au rebond ou après le mur. Si votre frappe touche directement une paroi adverse sans rebondir au sol, le point est perdu. Vous pouvez en revanche taper contre votre propre vitre pour renvoyer la balle de l'autre côté.",
      },
      {
        q: "A-t-on le droit de volleyer ?",
        a: "Oui, partout sauf au retour de service : le relanceur doit laisser la balle rebondir. Au filet, la volée et le smash sont même les coups qui font gagner la plupart des points. La balle ne rebondit qu'une fois au sol, et le joueur ne doit toucher ni le filet ni le camp adverse.",
      },
    ],
  },
  {
    title: "Le matériel",
    faq: [
      {
        q: "Quelle raquette choisir pour débuter ?",
        a: "Une raquette ronde, plutôt légère (autour de 355-365 g) et à mousse souple : elle pardonne les frappes décentrées et facilite le contrôle. Les formes en goutte d'eau offrent un compromis, les formes diamant sont réservées aux joueurs confirmés qui cherchent la puissance. La plupart des clubs louent des raquettes pour vos premières parties.",
      },
      {
        q: "Quelles balles et quelles chaussures utiliser ?",
        a: "Des balles de padel, légèrement moins pressurisées que celles de tennis. Changez-les dès qu'elles rebondissent moins. Côté chaussures, prenez une semelle à chevrons (« espiga ») ou omni, adaptée au gazon synthétique sablé : elle évite de glisser et protège les chevilles. Les chaussures de running sont à éviter.",
      },
    ],
  },
  {
    title: "Jouer au padel en Tunisie",
    faq: [
      {
        q: "Où jouer au padel en Tunisie ?",
        a: "Le padel s'est développé très vite dans le Grand Tunis, au Sahel, à Sfax et dans les zones touristiques comme Hammamet et Djerba. L'annuaire PadelTunisia recense les clubs par ville, avec leurs terrains, leurs horaires et leurs contacts.",
      },
      {
        q: "Combien coûte une partie de padel en Tunisie ?",
        a: "Les tarifs dépendent du club, de l'horaire (heures creuses ou soirée) et du type de terrain, couvert ou extérieur. Une réservation dure en général 60 à 90 minutes et son prix se partage entre les quatre joueurs. Contactez directement le club pour ses tarifs actuels.",
      },
      {
        q: "Comment réserver un terrain ?",
        a: "La plupart des clubs tunisiens prennent les réservations par téléphone ou WhatsApp, certains via une application. Les coordonnées de chaque club figurent sur sa fiche dans l'annuaire. Réservez quelques jours à l'avance pour les créneaux du soir et du week-end, les plus demandés.",
      },
      {
        q: "Peut-on jouer l'été malgré la chaleur ?",
        a: "Oui, en choisissant bien son créneau : tôt le matin ou à partir de la fin d'après-midi sur les terrains extérieurs, n'importe quand sur les terrains couverts. Pensez à l'eau, à la casquette et à la crème solaire. Les fiches clubs précisent si les terrains sont couverts ou en plein air.",
      },
      {
        q: "Comment participer à un tournoi ?",
        a: "Les clubs organisent régulièrement des tournois amicaux ouverts à tous les niveaux : c'est la meilleure porte d'entrée. Pour la compétition officielle, le circuit de la Fédération Tunisienne de Tennis (FTT) propose des tournois homologués et un classement. Notre calendrier des événements recense les prochaines dates.",
      },
    ],
  },
];

const allFaq = sections.flatMap((s) => s.faq);
const cities = ["Tunis", "Sfax", "Hammamet", "Djerba", "Monastir", "Sousse"];

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: pageTitle("Guide du padel : règles, matériel et conseils") },
      {
        name: "description",
        content: "Règles du padel, service, points, vitres, choix de la raquette, prix et réservation en Tunisie : le guide complet pour bien débuter.",
      },
      { property: "og:title", content: "Guide du padel pour débutants" },
      { property: "og:description", content: "Règles, matériel et conseils pour bien commencer le padel en Tunisie." },
      { property: "og:url", content: absoluteUrl("/guide") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/guide") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: allFaq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <>
      <PageHero eyebrow="Guide" title="Le padel, simplement" intro="Règles, matériel et bons plans pour réussir votre premier match en Tunisie." />
      <div className="mx-auto max-w-3xl px-4 pt-12">
        <p className="text-lg leading-relaxed text-muted-foreground">
          Vous n'avez jamais tenu une raquette de padel ? Ce guide répond aux questions que se posent tous les débutants : comment on joue, avec quel matériel, et où
          trouver un terrain près de chez vous.
        </p>
        {sections.map((s) => (
          <section key={s.title} className="mt-12">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{s.title}</h2>
            <Reveal className="mt-5 grid gap-3">
              {s.faq.map((f) => (
                <details data-reveal key={f.q} className="group rounded-3xl border bg-card p-6 open:shadow-lift">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
                    <h3>{f.q}</h3>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </Reveal>
          </section>
        ))}

        <section className="mt-14 rounded-3xl bg-secondary p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold">Pour aller plus loin</h2>
          <p className="mt-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Clubs par ville</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link key={c} to="/clubs/ville/$city" params={{ city: citySlug(c) }} className="rounded-full bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
                Padel à {c}
              </Link>
            ))}
          </div>
          <ul className="mt-6 grid gap-2 font-semibold">
            <li>
              <Link to="/articles/$slug" params={{ slug: "guide-circuit-ftt-padel-tunisie" }} className="text-court underline">
                Circuit FTT : jouer vos premiers tournois en Tunisie →
              </Link>
            </li>
            <li>
              <Link to="/evenements" className="text-court underline">
                Calendrier des tournois de padel →
              </Link>
            </li>
          </ul>
          <Link to="/clubs" search={{ q: "", city: "" }} className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-bold text-primary-foreground">
            Trouver un club près de chez moi
          </Link>
        </section>
      </div>
    </>
  );
}

import { createFileRoute, Link, stripSearchParams } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/site-chrome";
import { absoluteUrl, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL, SITE_NAME } from "@/lib/site";

// ?sujet=club&club=Padel%20House pre-fills the form (e.g. from "Signaler une erreur" on a club page).
const search = z.object({
  sujet: fallback(z.enum(["club", "tournoi", "partenariat", "autre"]), "autre").default("autre"),
  club: fallback(z.string().max(120), "").default(""),
});

export const Route = createFileRoute("/contact")({
  validateSearch: zodValidator(search),
  // Keep defaults out of the URL: /contact, not /contact?sujet=autre&club=.
  search: { middlewares: [stripSearchParams({ sujet: "autre", club: "" })] },
  head: () => ({
    meta: [
      { title: `Contact | ${SITE_NAME}` },
      { name: "description", content: "Contactez PadelTunisia : ajouter ou corriger un club, annoncer un tournoi, proposer un partenariat." },
      { property: "og:title", content: `Contacter ${SITE_NAME}` },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contact") }],
  }),
  component: ContactPage,
});

const reasons = [
  { title: "Votre club n'est pas listé ou une info est fausse ?", text: "Envoyez-nous le nom du club, l'adresse, les horaires, le nombre de terrains et un téléphone : on met la fiche à jour." },
  { title: "Vous organisez un tournoi ?", text: "Dates, lieu, tableaux, frais et lien d'inscription : on l'ajoute au calendrier." },
  { title: "Partenariat ou publicité", text: "Clubs, marques, organisateurs : parlons de visibilité auprès des joueurs de padel en Tunisie." },
];

function ContactPage() {
  const { sujet, club } = Route.useSearch();
  const channels = [
    { href: `mailto:${CONTACT_EMAIL}`, label: CONTACT_EMAIL, hint: "E-mail", Icon: Mail },
    { href: `tel:${CONTACT_PHONE_TEL}`, label: CONTACT_PHONE, hint: "Téléphone", Icon: Phone },
    { href: `https://wa.me/${CONTACT_PHONE_TEL.replace("+", "")}`, label: CONTACT_PHONE, hint: "WhatsApp", Icon: MessageCircle },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Nous contacter" intro="Une question, une correction ou un tournoi à annoncer ? Écrivez-nous, on répond rapidement." />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-12 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <ContactForm topic={sujet} organization={club} />
          <section className="grid gap-4 sm:grid-cols-3">
            {reasons.map((r) => (
              <div key={r.title} className="rounded-3xl border bg-card p-5">
                <h2 className="font-bold leading-snug">{r.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </section>
        </div>
        <aside className="rounded-3xl border bg-card p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-lg font-bold">Coordonnées</h2>
          <ul className="mt-4 grid gap-2">
            {channels.map(({ href, label, hint, Icon }) => (
              <li key={hint}>
                <a href={href} target={href.startsWith("https") ? "_blank" : undefined} rel={href.startsWith("https") ? "noopener noreferrer" : undefined} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 transition-colors hover:bg-accent hover:text-accent-foreground">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span><span className="block text-xs font-semibold text-muted-foreground">{hint}</span><span className="font-semibold">{label}</span></span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Voir aussi nos <Link to="/mentions-legales" className="underline">mentions légales</Link>.</p>
        </aside>
      </div>
    </>
  );
}

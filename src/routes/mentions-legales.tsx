import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site-chrome";
import { absoluteUrl, CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: `Mentions légales | ${SITE_NAME}` },
      { name: "description", content: "Éditeur, hébergement, propriété intellectuelle et sources des données du site PadelTunisia." },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/mentions-legales") }],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <>
      <PageHero eyebrow="Informations" title="Mentions légales" intro={`Les informations légales du site ${SITE_URL.replace("https://", "")}.`} />
      <div className="article-body mx-auto max-w-3xl px-4 pt-12">
        <h2>Éditeur</h2>
        <p>
          Le site {SITE_URL.replace("https://", "")} est édité par {SITE_NAME}.<br />
          Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · {CONTACT_PHONE}
        </p>

        <h2>Hébergement</h2>
        <p>Le site est servi et protégé par le réseau de Cloudflare, Inc. (101 Townsend St, San Francisco, CA 94107, États-Unis).</p>

        <h2>Sources des données</h2>
        <p>
          L'annuaire des clubs et le calendrier des tournois sont établis à partir d'informations publiques (sites des clubs, Fédération Tunisienne de Tennis via FTTLP,
          Fédération internationale de padel, médias spécialisés), vérifiées et mises à jour régulièrement. Chaque actualité renvoie vers l'article d'origine et cite sa source.
          Les horaires, tarifs et coordonnées peuvent changer : vérifiez-les auprès des clubs avant de vous déplacer.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Les textes et la mise en page du site appartiennent à {SITE_NAME}. Les logos des clubs, les affiches de tournois et les visuels d'actualité restent la propriété de leurs
          titulaires respectifs ; ils sont reproduits à titre d'illustration, avec un lien vers leur source. Tout titulaire qui souhaite le retrait ou la modification d'un contenu
          peut nous écrire à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : la demande est traitée sous 72 heures.
        </p>

        <h2>Corrections</h2>
        <p>
          Une information est inexacte ? Votre club n'apparaît pas ? <Link to="/contact">Contactez-nous</Link> et nous mettrons la fiche à jour.
        </p>

        <h2>Données personnelles</h2>
        <p>
          Voir notre <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </div>
    </>
  );
}

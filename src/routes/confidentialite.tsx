import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site-chrome";
import { absoluteUrl, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: `Politique de confidentialité | ${SITE_NAME}` },
      { name: "description", content: "Quelles données PadelTunisia traite, pourquoi, et comment exercer vos droits." },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/confidentialite") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Informations" title="Politique de confidentialité" intro="Ce que nous collectons, et ce que nous ne collectons pas." />
      <div className="article-body mx-auto max-w-3xl px-4 pt-12">
        <h2>En bref</h2>
        <p>
          {SITE_NAME} ne demande ni inscription ni compte, et ne dépose aucun cookie publicitaire. Nous ne vendons ni ne partageons de données personnelles. Seule la
          mesure d'audience (Google Analytics) utilise des cookies.
        </p>

        <h2>Données techniques</h2>
        <p>
          Comme tout site web, nos serveurs et notre réseau de diffusion (Cloudflare) enregistrent des journaux techniques : adresse IP, page demandée, date et navigateur.
          Ils servent uniquement à faire fonctionner le site, à le protéger contre les abus et à corriger les erreurs, et sont conservés pour une durée limitée.
        </p>

        <h2>Mesure d'audience</h2>
        <p>
          Pour connaître la fréquentation du site, nous utilisons Google Analytics 4 : pages consultées, type d'appareil et canal d'arrivée. Ces statistiques servent
          uniquement à améliorer le site ; les signaux publicitaires sont désactivés. Google Analytics dépose des cookies de mesure (<code>_ga</code>) conservés jusqu'à
          14 mois. Vous pouvez les bloquer dans les réglages de votre navigateur ou avec le{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">module de désactivation de Google Analytics</a>.
        </p>
        <p>
          Les données sont traitées par Google Ireland Ltd et peuvent être transférées aux États-Unis ; voir la{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité de Google</a>.
        </p>

        <h2>Messages que vous nous envoyez</h2>
        <p>
          Le <Link to="/contact">formulaire de contact</Link> enregistre votre nom, votre e-mail, votre message et, si vous les indiquez, votre téléphone et votre club. Nous les
          utilisons uniquement pour vous répondre et, le cas échéant, mettre à jour une fiche club ou un tournoi. Ces messages sont conservés 12 mois au plus, puis supprimés.
          Pour limiter les abus, nous conservons aussi une empreinte chiffrée (non réversible) de votre adresse IP, jamais l'adresse elle-même.
        </p>
        <p>Il en va de même si vous nous écrivez directement par e-mail, téléphone ou WhatsApp.</p>

        <h2>Liens externes</h2>
        <p>
          Le site renvoie vers des sites tiers (clubs, fédérations, médias, plateformes de réservation, cartes). Leur propre politique de confidentialité s'applique lorsque vous
          les consultez.
        </p>

        <h2>Vos droits</h2>
        <p>
          Conformément à la loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à caractère personnel, vous pouvez demander l'accès, la
          rectification ou la suppression de vos données en écrivant à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p>
          Voir aussi nos <Link to="/mentions-legales">mentions légales</Link>.
        </p>
      </div>
    </>
  );
}

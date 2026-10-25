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
          {SITE_NAME} ne demande ni inscription ni compte, et ne dépose aucun cookie publicitaire. Nous ne vendons ni ne partageons de données personnelles.
        </p>

        <h2>Données techniques</h2>
        <p>
          Comme tout site web, nos serveurs et notre réseau de diffusion (Cloudflare) enregistrent des journaux techniques : adresse IP, page demandée, date et navigateur.
          Ils servent uniquement à faire fonctionner le site, à le protéger contre les abus et à corriger les erreurs, et sont conservés pour une durée limitée.
        </p>

        <h2>Messages que vous nous envoyez</h2>
        <p>
          Si vous nous écrivez par e-mail, téléphone ou WhatsApp, nous utilisons vos coordonnées uniquement pour vous répondre et, le cas échéant, mettre à jour une fiche club
          ou un tournoi.
        </p>

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

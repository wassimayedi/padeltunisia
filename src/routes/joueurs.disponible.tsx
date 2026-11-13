import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AvailabilityForm } from "@/components/availability-form";
import { getViewer } from "@/functions/auth";
import { getClubChoices } from "@/functions/matches";
import { getMyAvailability } from "@/functions/players";
import { AVAILABILITY_DAYS } from "@/lib/players";
import { pageTitle } from "@/lib/site";

export const Route = createFileRoute("/joueurs/disponible")({
  // Login, then a complete profile (level, gender, phone), both bring the player back here.
  loader: async ({ location }) => {
    const viewer = await getViewer();
    if (!viewer) throw redirect({ to: "/connexion", search: { next: location.href, erreur: 0 } });
    if (!viewer.complete || !viewer.level || !viewer.gender) throw redirect({ to: "/profil", search: { next: location.href } });
    const [clubs, mine] = await Promise.all([getClubChoices(), getMyAvailability()]);
    if (!mine) throw redirect({ to: "/connexion", search: { next: location.href, erreur: 0 } });
    return { viewer: { id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl, level: viewer.level, gender: viewer.gender, city: viewer.city }, clubs, mine };
  },
  head: () => ({ meta: [{ title: pageTitle("Me rendre disponible") }, { name: "robots", content: "noindex" }] }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const { viewer, clubs, mine } = Route.useLoaderData();
  const available = mine.availableUntil !== null;
  // -mb-24 cancels the footer's mt-24 on this page; pb-10 leaves a short gap (40px) above the footer.
  return (
    <div className="-mb-24 pb-10">
      <section className="court-lines relative overflow-hidden bg-court text-court-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pb-24">
          <Link to="/joueurs" className="inline-flex items-center gap-2 text-sm font-semibold text-court-foreground/80 hover:text-court-foreground"><ArrowLeft className="h-4 w-4" />Tous les joueurs</Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-lime">Joueurs disponibles</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] sm:text-5xl">{available ? "Modifier ma disponibilité" : "Me rendre disponible"}</h1>
          <p className="mt-3 max-w-xl text-court-foreground/80">
            Apparaissez dans la liste pendant {AVAILABILITY_DAYS} jours : les joueurs de votre niveau pourront vous contacter sur WhatsApp pour organiser un match.
          </p>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4">
        <AvailabilityForm clubs={clubs} viewer={viewer} mine={mine} />
      </div>
    </div>
  );
}

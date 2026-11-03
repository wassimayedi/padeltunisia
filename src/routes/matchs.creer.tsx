import { createFileRoute, Link, redirect, stripSearchParams } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

import { CreateMatchForm } from "@/components/create-match-form";
import { getViewer } from "@/functions/auth";
import { getClubChoices } from "@/functions/matches";
import { pageTitle } from "@/lib/site";

export const Route = createFileRoute("/matchs/creer")({
  validateSearch: zodValidator(z.object({ city: fallback(z.string(), "").default(""), club: fallback(z.string(), "").default("") })),
  search: { middlewares: [stripSearchParams({ city: "", club: "" })] },
  // Login, then a complete profile (level, gender, phone), both bring the player back here.
  loader: async ({ location }) => {
    const viewer = await getViewer();
    if (!viewer) throw redirect({ to: "/connexion", search: { next: location.href, erreur: 0 } });
    if (!viewer.complete || !viewer.level || !viewer.gender) throw redirect({ to: "/profil", search: { next: location.href } });
    return { viewer: { name: viewer.name, avatarUrl: viewer.avatarUrl, level: viewer.level, gender: viewer.gender, city: viewer.city }, clubs: await getClubChoices() };
  },
  head: () => ({ meta: [{ title: pageTitle("Créer un match") }, { name: "robots", content: "noindex" }] }),
  component: CreateMatchPage,
});

function CreateMatchPage() {
  const { viewer, clubs } = Route.useLoaderData();
  const { city, club } = Route.useSearch();
  return (
    <>
      <section className="court-lines relative overflow-hidden bg-court text-court-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pb-24">
          <Link to="/matchs" className="inline-flex items-center gap-2 text-sm font-semibold text-court-foreground/80 hover:text-court-foreground"><ArrowLeft className="h-4 w-4" />Tous les matchs</Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-lime">Nouveau match</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] sm:text-5xl">Créer un match</h1>
          <p className="mt-3 max-w-xl text-court-foreground/80">Choisissez le club, le créneau et la fourchette de niveaux : les joueurs qui correspondent pourront demander à vous rejoindre.</p>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4">
        <CreateMatchForm clubs={clubs} viewer={viewer} defaults={{ city, clubSlug: club }} />
      </div>
    </>
  );
}

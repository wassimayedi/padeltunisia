import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { GoogleButton } from "@/components/login-button";
import { safeNextPath } from "@/lib/matches";
import { pageTitle } from "@/lib/site";

export const Route = createFileRoute("/connexion")({
  validateSearch: zodValidator(z.object({ next: fallback(z.string(), "/matchs").default("/matchs"), erreur: fallback(z.number(), 0).default(0) })),
  head: () => ({ meta: [{ title: pageTitle("Connexion") }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { next, erreur } = Route.useSearch();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold">Connexion</h1>
      <p className="mt-3 text-muted-foreground">Connectez-vous pour créer un match, rejoindre des joueurs de votre niveau et retrouver vos matchs.</p>
      {erreur ? <p className="mt-6 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">La connexion n'a pas abouti. Réessayez.</p> : null}
      <GoogleButton next={safeNextPath(next)} className="mt-8 w-full" />
      <p className="mt-6 text-xs text-muted-foreground">Nous utilisons votre nom, votre e-mail et votre photo Google. Votre téléphone n'est montré qu'aux joueurs de vos matchs.</p>
    </div>
  );
}

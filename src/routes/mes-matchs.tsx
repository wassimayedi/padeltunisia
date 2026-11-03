import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { MatchCard } from "@/components/match-card";
import { getViewer } from "@/functions/auth";
import { getMyMatches } from "@/functions/matches";
import { pageTitle } from "@/lib/site";

export const Route = createFileRoute("/mes-matchs")({
  loader: async ({ location }) => {
    if (!(await getViewer())) throw redirect({ to: "/connexion", search: { next: location.href, erreur: 0 } });
    return { matches: await getMyMatches(), now: Date.now() };
  },
  gcTime: 0,
  head: () => ({ meta: [{ title: pageTitle("Mes matchs") }, { name: "robots", content: "noindex" }] }),
  component: MyMatchesPage,
});

const TABS = [
  { key: "upcoming", label: "À venir" },
  { key: "pending", label: "En attente" },
  { key: "past", label: "Passés" },
] as const;

function MyMatchesPage() {
  const { matches, now } = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("upcoming");
  const upcoming = (m: (typeof matches)[number]) => m.endsAt.getTime() > now && m.status !== "cancelled" && m.status !== "played";
  const lists = {
    // Soonest first for what's ahead, most recent first for history.
    upcoming: matches.filter((m) => upcoming(m) && (m.myStatus === "creator" || m.myStatus === "accepted")).reverse(),
    pending: matches.filter((m) => upcoming(m) && m.myStatus === "pending").reverse(),
    past: matches.filter((m) => !upcoming(m) || m.myStatus === "rejected"),
  };
  const list = lists[tab];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold">Mes matchs</h1>
        <Link to="/matchs/creer" className="rounded-full bg-court px-5 py-2.5 font-bold text-court-foreground">Créer un match</Link>
      </div>
      <div role="tablist" className="mt-8 inline-flex gap-1 rounded-full bg-muted p-1">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t.label} ({lists[t.key].length})
          </button>
        ))}
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => <li key={m.id}><MatchCard match={m} myStatus={m.myStatus} /></li>)}
      </ul>
      {list.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          {tab === "pending" ? "Aucune demande en attente." : tab === "past" ? "Pas encore d'historique." : "Aucun match à venir."}{" "}
          <Link to="/matchs" className="font-semibold text-court underline">Trouver un match</Link>
        </p>
      )}
    </div>
  );
}

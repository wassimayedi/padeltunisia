import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, CircleDashed, Clock, Gauge, Lock, MapPin, UserPlus, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ClubLogo } from "@/components/cards";
import { PlayerAvatar } from "@/components/match-card";
import { WhatsappIcon } from "@/components/whatsapp-icon";
import { cancelMatch, getMatch, joinMatch, leaveMatch, removeMatchPlayer, reviewJoin } from "@/functions/matches";
import { formatMatchDay, formatTime, genderLabel, levelLabel, levelRangeLabel, spotsLeft, whatsappLink, type Contact, type MatchDetail } from "@/lib/matches";
import { absoluteUrl, pageTitle } from "@/lib/site";

export const Route = createFileRoute("/matchs/$id")({
  validateSearch: zodValidator(z.object({ join: fallback(z.number(), 0).default(0) })),
  loader: async ({ params }) => {
    if (!z.string().uuid().safeParse(params.id).success) throw notFound();
    const match = await getMatch({ data: { id: params.id } });
    if (!match) throw notFound();
    return match;
  },
  head: ({ loaderData: m }) => {
    // Matches expire within days: keep them out of the index, the list page is the one to rank.
    // Links stay followed, and the social tags make the WhatsApp preview when a player shares the match.
    if (!m) return { meta: [{ title: pageTitle("Match") }, { name: "robots", content: "noindex, follow" }] };
    const left = spotsLeft(m);
    const title = `Match de padel à ${m.club.name}, ${formatMatchDay(m.startsAt)} à ${formatTime(m.startsAt)}`;
    const desc = `${levelRangeLabel(m)} · ${genderLabel(m.gender)} · ${left > 0 ? `${left} place${left > 1 ? "s" : ""} libre${left > 1 ? "s" : ""}` : "complet"} à ${m.club.name} (${m.club.city}).`;
    return {
      meta: [
        { title: pageTitle(title) },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: absoluteUrl(`/matchs/${m.id}`) },
        ...(m.club.logoUrl ? [{ property: "og:image", content: absoluteUrl(m.club.logoUrl) }] : []),
      ],
    };
  },
  component: MatchPage,
});

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'action a échoué, réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function MatchPage() {
  const m = Route.useLoaderData();
  const { join } = Route.useSearch();
  const navigate = useNavigate({ from: "/matchs/$id" });
  const { busy, run } = useAction();
  const left = spotsLeft(m);
  const here = `/matchs/${m.id}`;

  const requestJoin = () => run(() => joinMatch({ data: { id: m.id } }), "Demande envoyée ! L'organisateur est prévenu.");

  // Back from login with ?join=1: send the request the player had clicked, once.
  const replayed = useRef(false);
  useEffect(() => {
    if (!join || replayed.current) return;
    replayed.current = true;
    navigate({ search: { join: 0 }, replace: true });
    if (m.viewer?.canJoin) void requestJoin();
  });

  const accepted = m.players.filter((p) => p.status === "accepted");
  const pending = m.players.filter((p) => p.status === "pending");
  const closed = m.status === "cancelled" || m.status === "played";
  const lineup = [{ ...m.creator, contact: m.creatorContact }, ...accepted];

  return (
    <>
      <section className="court-lines relative overflow-hidden bg-court text-court-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-8">
          <Link to="/matchs" className="inline-flex items-center gap-2 text-sm font-semibold text-court-foreground/70 hover:text-court-foreground"><ArrowLeft className="h-4 w-4" />Tous les matchs</Link>
          <div className="mt-8 flex items-center gap-4">
            <ClubLogo club={m.club} className="h-16 w-16 rounded-2xl text-lg ring-4 ring-white/15" eager />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-lime">
                Match · {genderLabel(m.gender)}
                {!closed && left === 0 && <span className="flex items-center gap-1 rounded-full bg-lime px-2.5 py-0.5 text-xs tracking-wider text-navy"><CheckCircle2 className="h-3.5 w-3.5" />Complet</span>}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">
                <Link to="/clubs/$slug" params={{ slug: m.club.slug }} className="hover:underline">{m.club.name}</Link>
              </h1>
              <p className="mt-1 flex items-center gap-1 text-court-foreground/80"><MapPin className="h-4 w-4" />{m.club.city}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-12 grid max-w-6xl gap-6 px-4 pb-16 lg:grid-cols-[1fr_360px]">
        <div className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-lift sm:grid-cols-4">
            <Fact icon={<CalendarDays />} label="Date"><span className="capitalize">{formatMatchDay(m.startsAt)}</span></Fact>
            <Fact icon={<Clock />} label="Horaire">{formatTime(m.startsAt)}–{formatTime(m.endsAt)}</Fact>
            <Fact icon={<Gauge />} label="Niveau">
              <span className="rounded-full bg-court px-2.5 py-0.5 text-sm text-court-foreground">{levelRangeLabel(m)}</span>
            </Fact>
            <Fact icon={m.courtBooked ? <CheckCircle2 /> : <CircleDashed />} label="Terrain">{m.courtBooked ? "Réservé" : "À réserver"}</Fact>
          </dl>
          <p className="mt-3 px-1 text-sm text-muted-foreground">
            {levelLabel(m.levelMin)}{m.levelMax !== m.levelMin ? ` à ${levelLabel(m.levelMax)}` : ""} · {genderLabel(m.gender)}
          </p>
        </div>

        <div className="grid content-start gap-6">
          {m.note && (
            <figure className="rounded-3xl border bg-card p-5">
              <figcaption className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Le mot de l'organisateur</figcaption>
              <blockquote className="mt-2 whitespace-pre-line">{m.note}</blockquote>
            </figure>
          )}

          <section className="rounded-3xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-court" />Joueurs
              <span className="ml-auto text-sm font-semibold text-muted-foreground">{m.accepted + 1}/{m.spots + 1}</span>
            </h2>
            {m.playersHidden ? (
              <p className="mt-4 flex items-start gap-3 rounded-2xl bg-muted px-4 py-3 text-sm">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-court" />
                {m.viewer ? (
                  <span>Match anonyme : l'organisateur et les joueurs vous seront dévoilés une fois votre demande acceptée.</span>
                ) : (
                  <span>
                    Match anonyme : les joueurs sont dévoilés aux participants.{" "}
                    <Link to="/connexion" search={{ next: here, erreur: 0 }} className="font-semibold text-court underline">Connectez-vous</Link> pour demander à rejoindre.
                  </span>
                )}
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {lineup.map((p, i) => (
                  <PlayerSlot key={p.id} player={p} tag={i === 0 ? "Organisateur" : undefined}>
                    {i > 0 && m.viewer?.role === "creator" && !closed && (
                      <button disabled={busy} onClick={() => confirm(`Retirer ${p.name} du match ?`) && run(() => removeMatchPlayer({ data: { id: m.id, playerId: p.id } }), "Joueur retiré, la place est de nouveau libre.")} className="text-xs font-semibold text-muted-foreground hover:text-destructive">
                        Retirer
                      </button>
                    )}
                  </PlayerSlot>
                ))}
                {!closed && Array.from({ length: left }, (_, i) => (
                  <li key={`free-${i}`} className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-semibold text-muted-foreground">
                    <UserPlus className="h-4 w-4" />Place libre
                  </li>
                ))}
              </ul>
            )}
            {m.viewer && m.viewer.role !== "none" && !closed && accepted.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Les numéros WhatsApp ne sont visibles que par les joueurs du match.</p>}
          </section>

          {m.viewer?.role === "creator" && !closed && pending.length > 0 && (
            <section className="rounded-3xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                Demandes en attente
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-court px-1.5 text-xs text-court-foreground">{pending.length}</span>
              </h2>
              <ul className="mt-4 grid gap-3">
                {pending.map((p) => (
                  <PlayerSlot key={p.id} player={p}>
                    <div className="flex gap-2">
                      <button disabled={busy || left === 0} onClick={() => run(() => reviewJoin({ data: { id: m.id, playerId: p.id, accept: true } }), `${p.name} est dans le match.`)} className="flex h-9 items-center gap-1 rounded-full bg-court px-4 text-sm font-bold text-court-foreground disabled:opacity-50">
                        <Check className="h-4 w-4" />Accepter
                      </button>
                      <button disabled={busy} onClick={() => run(() => reviewJoin({ data: { id: m.id, playerId: p.id, accept: false } }), "Demande refusée.")} className="flex h-9 items-center gap-1 rounded-full border px-4 text-sm font-bold disabled:opacity-50">
                        <X className="h-4 w-4" />Refuser
                      </button>
                    </div>
                  </PlayerSlot>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border bg-card p-5 shadow-lift">
            {m.status === "cancelled" ? (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-semibold text-destructive">Ce match a été annulé.</p>
            ) : m.status === "played" ? (
              <p className="rounded-2xl bg-muted px-4 py-3 font-semibold">Ce match est terminé.</p>
            ) : left === 0 ? (
              <>
                <p className="flex items-center gap-2 text-2xl font-extrabold text-court"><CheckCircle2 className="h-7 w-7" />Match complet</p>
                <p className="mt-1 text-sm text-muted-foreground">Les {m.spots + 1} joueurs sont réunis.{!m.courtBooked && " Il reste à réserver le terrain."}</p>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                  {Array.from({ length: m.spots + 1 }, (_, i) => <span key={i} className="h-2 flex-1 rounded-full bg-court" />)}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-muted-foreground">Places disponibles</p>
                <p className="mt-1 text-3xl font-extrabold">{left} sur {m.spots}</p>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                  {Array.from({ length: m.spots + 1 }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i <= m.accepted ? "bg-court" : "bg-muted"}`} />)}
                </div>
              </>
            )}
            <Actions m={m} here={here} busy={busy} onJoin={requestJoin} run={run} />
          </div>
          {!m.courtBooked && !closed && left > 0 && (
            <p className="mt-4 px-1 text-sm text-muted-foreground">
              Terrain pas encore réservé : l'organisateur s'en charge une fois le match complet. <Link to="/terrains" className="font-semibold text-court underline">Voir les terrains libres</Link>
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card p-4">
      <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-court">{icon}{label}</dt>
      <dd className="mt-1.5 font-bold">{children}</dd>
    </div>
  );
}

function Actions({ m, here, busy, onJoin, run }: { m: MatchDetail; here: string; busy: boolean; onJoin: () => void; run: ReturnType<typeof useAction>["run"] }) {
  const closed = m.status === "cancelled" || m.status === "played";
  if (closed) return null;
  const v = m.viewer;
  const button = "mt-5 h-12 w-full rounded-full font-bold disabled:opacity-60";
  if (!v)
    return (
      <Link to="/connexion" search={{ next: `${here}?join=1`, erreur: 0 }} className={`${button} grid place-items-center bg-court text-court-foreground`}>
        Se connecter pour rejoindre
      </Link>
    );
  if (v.role === "creator")
    return (
      <button disabled={busy} onClick={() => confirm("Annuler ce match ? Les joueurs seront prévenus.") && run(() => cancelMatch({ data: { id: m.id } }), "Match annulé, les joueurs sont prévenus.")} className={`${button} border text-destructive`}>
        Annuler le match
      </button>
    );
  if (v.status === "accepted")
    return (
      <button disabled={busy} onClick={() => confirm("Quitter ce match ? L'organisateur sera prévenu.") && run(() => leaveMatch({ data: { id: m.id } }), "Vous avez quitté le match.")} className={`${button} border`}>
        Quitter le match
      </button>
    );
  if (v.status === "pending")
    return (
      <div className="mt-5">
        <p className="rounded-2xl bg-lime/30 px-4 py-3 text-sm font-semibold text-navy">Demande envoyée : vous serez prévenu dès que l'organisateur répond.</p>
        <button disabled={busy} onClick={() => run(() => leaveMatch({ data: { id: m.id } }), "Demande retirée.")} className={`${button} mt-3 border`}>Retirer ma demande</button>
      </div>
    );
  if (v.canJoin)
    return (
      <button disabled={busy} onClick={onJoin} className={`${button} bg-court text-court-foreground`}>
        {busy ? "Envoi…" : "Demander à rejoindre"}
      </button>
    );
  const needsProfile = v.reason?.startsWith("Complétez");
  return (
    <div className="mt-5 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold">
      {v.reason}
      {needsProfile && <Link to="/profil" search={{ next: `${here}?join=1` }} className="ml-2 text-court underline">Compléter mon profil</Link>}
    </div>
  );
}

function PlayerSlot({ player, tag, children }: { player: { name: string; avatarUrl: string | null; level: number | null; contact: Contact | null }; tag?: string | undefined; children?: React.ReactNode }) {
  const c = player.contact;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={player} className="h-11 w-11" />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-bold">{player.name}</span>
            {tag && <span className="shrink-0 rounded-full bg-lime/40 px-2 py-0.5 text-[10px] font-bold uppercase text-navy">{tag}</span>}
          </span>
          <span className="block text-xs text-muted-foreground">{player.level ? `Niveau ${player.level} · ${levelLabel(player.level)}` : "Niveau non renseigné"}</span>
        </span>
      </span>
      <span className="flex items-center gap-3">
        {c && (
          <a href={whatsappLink(c.phoneCountryCode, c.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp à ${player.name}`} className="flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-sm font-bold text-white hover:opacity-90">
            <WhatsappIcon className="h-4 w-4" />WhatsApp
          </a>
        )}
        {children}
      </span>
    </li>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Lock, MapPin, Users } from "lucide-react";

import { ClubLogo } from "@/components/cards";
import { viewerQuery } from "@/components/login-button";
import { formatMatchDay, formatTime, genderLabel, levelRangeLabel, spotsLeft, type MatchSummary, type PublicPlayer } from "@/lib/matches";
import type { MatchPlayerStatus } from "@/db/schema";

export function PlayerAvatar({ player, className = "h-9 w-9" }: { player: Pick<PublicPlayer, "name" | "avatarUrl">; className?: string }) {
  return player.avatarUrl ? (
    <img src={player.avatarUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-lime ${className}`}>
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const STATUS_LABEL: Partial<Record<MatchPlayerStatus | "creator", string>> = {
  creator: "Organisateur",
  pending: "Demande en attente",
  accepted: "Inscrit",
  rejected: "Refusé",
  left: "Retiré",
};

export function MatchCard({ match, myStatus }: { match: MatchSummary; myStatus?: MatchPlayerStatus | "creator" | null }) {
  const left = spotsLeft(match);
  const closed = match.status === "cancelled" || match.status === "played";
  const full = !closed && left === 0;
  const { data: viewer } = useQuery(viewerQuery);
  // The organizer knows their own match is members-only: the badge is for the others.
  const mine = myStatus === "creator" || (!!viewer && viewer.id === match.creator.id);
  return (
    <Link
      to="/matchs/$id"
      params={{ id: match.id }}
      className={`flex h-full flex-col rounded-3xl border bg-card p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift ${closed ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <ClubLogo club={match.club} className="h-12 w-12 rounded-lg text-base" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{match.club.name}</h2>
          <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{match.club.city}</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 font-semibold capitalize">
        <CalendarDays className="h-4 w-4 text-court" />
        {formatMatchDay(match.startsAt)} · {formatTime(match.startsAt)}–{formatTime(match.endsAt)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        {full && <span className="flex items-center gap-1 rounded-full bg-navy px-3 py-1 text-lime"><CheckCircle2 className="h-3.5 w-3.5" />Complet</span>}
        <span className="rounded-full bg-court px-3 py-1 text-court-foreground">{levelRangeLabel(match)}</span>
        <span className="rounded-full bg-muted px-3 py-1">{genderLabel(match.gender)}</span>
        {match.courtBooked && <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"><CheckCircle2 className="h-3.5 w-3.5 text-court" />Terrain réservé</span>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        {/* The organizer; on a members-only match, visitors only learn that a member organizes it. */}
        <span className="flex min-w-0 items-center gap-2">
          {match.playersHidden ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Lock className="h-4 w-4" /></span>
          ) : (
            <PlayerAvatar player={match.creator} className="h-8 w-8" />
          )}
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Organisateur</span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              <span className="truncate">{match.playersHidden ? "Membre" : match.creator.name}</span>
              {match.membersOnly && !match.playersHidden && !mine && <span className="shrink-0 rounded-full bg-lime/30 px-2 py-0.5 text-[10px] font-bold uppercase text-navy" title="Joueurs visibles par les membres uniquement">Membres</span>}
            </span>
          </span>
        </span>
        {myStatus && STATUS_LABEL[myStatus] ? (
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold">{STATUS_LABEL[myStatus]}</span>
        ) : match.status === "cancelled" ? (
          <span className="shrink-0 text-sm font-bold text-destructive">Annulé</span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-court">
            <Users className="h-4 w-4" />
            {left > 0 ? `${left} place${left > 1 ? "s" : ""}` : "Complet"}
          </span>
        )}
      </div>
    </Link>
  );
}

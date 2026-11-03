import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Crown, Lock, MapPin, Users } from "lucide-react";

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

/** Chip for the viewer's request; organizer and accepted player get a ribbon instead. */
const STATUS_LABEL: Partial<Record<MatchPlayerStatus, string>> = {
  pending: "Demande en attente",
  rejected: "Refusé",
  left: "Retiré",
};

export function MatchCard({ match, myStatus }: { match: MatchSummary; myStatus?: MatchPlayerStatus | "creator" | null }) {
  const left = spotsLeft(match);
  const closed = match.status === "cancelled" || match.status === "played";
  const full = !closed && left === 0;
  const { data: viewer } = useQuery(viewerQuery);
  const organizer = myStatus === "creator" || (!!viewer && viewer.id === match.creator.id);
  const player = !organizer && myStatus === "accepted";
  // A full match can't be joined: shown, but not a link, except for those who play in it.
  const disabled = full && !organizer && !player;
  // Organizer and accepted player get a ribbon instead of the status chip; other statuses
  // (pending, refused, withdrawn) keep the chip.
  const chip = myStatus && myStatus !== "creator" && !player ? STATUS_LABEL[myStatus] : undefined;
  const body = (
    <>
      {(organizer || player) && (
        <span className={`-mt-1 mb-3 flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-bold ${organizer ? "bg-court text-court-foreground" : "bg-lime text-navy"}`}>
          {organizer ? <Crown className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {organizer ? "Vous organisez" : "Vous jouez"}
        </span>
      )}
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
        {/* The organizer; on an anonymous match, only its participants learn who organizes it. */}
        <span className="flex min-w-0 items-center gap-2">
          {match.playersHidden ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Lock className="h-4 w-4" /></span>
          ) : (
            <PlayerAvatar player={match.creator} className="h-8 w-8" />
          )}
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Organisateur</span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              <span className="truncate">{match.playersHidden ? "Anonyme" : match.creator.name}</span>
            </span>
          </span>
        </span>
        {chip ? (
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold">{chip}</span>
        ) : match.status === "cancelled" ? (
          <span className="shrink-0 text-sm font-bold text-destructive">Annulé</span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-court">
            <Users className="h-4 w-4" />
            {left > 0 ? `${left} place${left > 1 ? "s" : ""}` : "Complet"}
          </span>
        )}
      </div>
    </>
  );
  const box = `flex h-full flex-col rounded-3xl p-5 ${organizer ? "border-2 border-court bg-court/5" : player ? "border-2 border-lime bg-lime/10" : "border bg-card"}`;
  if (disabled) return <div aria-disabled className={`${box} cursor-not-allowed opacity-60`}>{body}</div>;
  return (
    <Link to="/matchs/$id" params={{ id: match.id }} className={`${box} transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift ${closed ? "opacity-60" : ""}`}>
      {body}
    </Link>
  );
}

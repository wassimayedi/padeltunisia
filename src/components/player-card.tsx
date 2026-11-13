import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, CalendarClock, Loader2, MapPin, MessageSquareText, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { viewerQuery } from "@/components/login-button";
import { PlayerAvatar } from "@/components/match-card";
import { WhatsappIcon } from "@/components/whatsapp-icon";
import { getPlayerContact } from "@/functions/players";
import { levelLabel, TIMEZONE, whatsappLink } from "@/lib/matches";
import { playerGenderLabel, type AvailablePlayer } from "@/lib/players";

const untilLabel = (d: Date) => new Intl.DateTimeFormat("fr-TN", { weekday: "short", day: "numeric", month: "short", timeZone: TIMEZONE }).format(d);

const GREETING = "Salut ! Je t'ai vu dans les joueurs disponibles sur PadelTunisia, partant pour un match ?";

/** Visitors are sent to log in; members fetch the number only on click, so it never sits in the page. */
export function WhatsappContactButton({ playerId, className = "" }: { playerId: string; className?: string }) {
  const { data: viewer } = useQuery(viewerQuery);
  const [loading, setLoading] = useState(false);
  const style = `flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${className}`;
  if (!viewer)
    return (
      <Link to="/connexion" search={{ next: "/joueurs" }} className={style}>
        <WhatsappIcon className="h-4 w-4 text-white" />
        Se connecter pour contacter
      </Link>
    );
  const contact = async () => {
    setLoading(true);
    try {
      const c = await getPlayerContact({ data: { id: playerId } });
      // Not window.open: after an await, browsers block it as a popup. On mobile this opens the app.
      window.location.assign(`${whatsappLink(c.phoneCountryCode, c.phone)}?text=${encodeURIComponent(GREETING)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'obtenir le contact, réessayez.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button type="button" onClick={contact} disabled={loading} className={style}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsappIcon className="h-4 w-4 text-white" />}
      Contacter sur WhatsApp
    </button>
  );
}

export function PlayerCard({ player, mine = false }: { player: AvailablePlayer; mine?: boolean }) {
  return (
    <div className={`flex h-full flex-col rounded-3xl p-5 ${mine ? "border-2 border-lime bg-lime/10" : "border bg-card"}`}>
      <div className="flex items-center gap-3">
        {player.name ? (
          <PlayerAvatar player={{ name: player.name, avatarUrl: player.avatarUrl }} className="h-12 w-12 text-base" />
        ) : (
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><UserRound className="h-6 w-6" /></span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{player.name ?? "Joueur anonyme"}</h2>
          {player.city && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{player.city}</p>}
        </div>
        {mine && <span className="ml-auto shrink-0 self-start rounded-full bg-lime px-3 py-1 text-xs font-bold text-navy">C'est vous</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-court px-3 py-1 text-court-foreground">Niveau {player.level} · {levelLabel(player.level)}</span>
        <span className="rounded-full bg-muted px-3 py-1">{playerGenderLabel(player.gender)}</span>
      </div>
      {player.clubs.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <Building2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Joue à</span>
          {player.clubs.map((c, i) => (
            <span key={c.slug}>
              <Link to="/clubs/$slug" params={{ slug: c.slug }} className="font-semibold text-court hover:underline">{c.name}</Link>
              {i < player.clubs.length - 1 && <span className="text-muted-foreground">,</span>}
            </span>
          ))}
        </p>
      )}
      {player.note && (
        <p className="mt-3 flex items-start gap-1.5 text-sm">
          <MessageSquareText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <q className="min-w-0 break-words italic">{player.note}</q>
        </p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarClock className="h-4 w-4 shrink-0" />
        Dispo jusqu'au {untilLabel(new Date(player.availableUntil))}
      </p>
      {!mine && (
        <div className="mt-auto pt-5">
          <WhatsappContactButton playerId={player.id} className="w-full" />
        </div>
      )}
    </div>
  );
}

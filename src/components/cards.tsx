import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, CalendarDays, Trophy } from "lucide-react";
import { courtTypesLabel, type ClubSummary } from "@/lib/clubs";
import { articleDate, type ArticleSummary } from "@/lib/magazine";
import { dateRange, dayOfMonth, eventPlace, shortMonth, type EventSummary } from "@/lib/events";
import { newsDate, type NewsSummary } from "@/lib/news";

const GENERIC = new Set(["padel", "club", "de", "du", "la", "le", "les", "in", "the", "by", "&"]);
/** "Padel in Mourouj" → "M", "One Padel Hammamet" → "OH": skip generic words. */
const initials = (name: string) => {
  const words = name.split(/\s+/).filter((w) => !GENERIC.has(w.toLowerCase()));
  return (words.length ? words : [name]).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
};

/** Club logo tile; falls back to the name's initials when the club has no logo. */
/** Pass `eager` when the logo is above the fold. */
export function ClubLogo({ club, className = "", eager = false }: { club: Pick<ClubSummary, "name" | "logoUrl">; className?: string; eager?: boolean }) {
  return club.logoUrl ? (
    <img src={club.logoUrl} alt={`Logo ${club.name}`} loading={eager ? "eager" : "lazy"} className={`shrink-0 bg-white object-cover ${className}`} />
  ) : (
    <span aria-hidden className={`grid shrink-0 place-items-center bg-navy font-display font-extrabold text-lime ${className}`}>
      {initials(club.name)}
    </span>
  );
}

export function ClubCard({ club }: { club: ClubSummary }) {
  const kind = courtTypesLabel(club.courtTypes);
  return (
    <Link data-reveal to="/clubs/$slug" params={{ slug: club.slug }} className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-card p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <ClubLogo club={club} className="mb-4 h-16 w-16 rounded-lg text-xl" />
      <h3 className="text-xl font-bold">{club.name}</h3>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{club.area ? `${club.city} · ${club.area}` : club.city}</p>
      {club.courts != null && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-court">
          {club.courts} {club.courts === 1 ? "terrain" : "terrains"}{kind && ` · ${kind}`}
        </p>
      )}
      <ArrowUpRight className="absolute bottom-5 right-5 h-5 w-5 text-court opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function ArticleCard({ a }: { a: ArticleSummary }) {
  return (
    <Link data-reveal to="/articles/$slug" params={{ slug: a.slug }} className="group flex flex-col overflow-hidden rounded-3xl border bg-card transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[1200/630] overflow-hidden bg-court">
        {a.imageUrl && <img src={a.imageUrl} alt={a.imageAlt ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        <span className="absolute left-3 top-3 rounded-full bg-lime px-3 py-1 text-xs font-bold text-navy shadow-sm">{a.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold leading-tight group-hover:text-court">{a.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</p>
        <p className="mt-auto pt-4 text-xs font-semibold text-muted-foreground"><time dateTime={a.publishedOn}>{articleDate(a.publishedOn)}</time> · {a.readingMinutes} min de lecture</p>
      </div>
    </Link>
  );
}

export function EventCard({ e }: { e: EventSummary }) {
  return (
    <li data-reveal className="group relative flex flex-col overflow-hidden rounded-3xl border bg-card transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative h-40 overflow-hidden bg-court">
        {e.posterUrl ? (
          <img src={e.posterUrl} alt={`Affiche ${e.title}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          // No poster: court-style cover with the circuit level.
          <div className="court-lines grid h-full place-items-center bg-gradient-to-br from-court to-navy px-6 text-center">
            <span className="font-display text-2xl font-extrabold leading-tight text-court-foreground/90">{e.level}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 grid h-14 w-14 place-items-center rounded-2xl bg-white text-center shadow-lift">
          <div>
            <p className="font-display text-xl font-extrabold leading-none text-navy">{dayOfMonth(e.startDate)}</p>
            <p className="text-[10px] font-bold uppercase text-court">{shortMonth(e.startDate)}</p>
          </div>
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${e.scope === "tn" ? "bg-lime text-navy" : "bg-white text-navy"}`}>{e.scope === "tn" ? "TN" : "INT"}</span>
          {e.ongoing && <span className="rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">En cours</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-bold leading-snug">
          {/* Stretched link: the whole card opens the event page. */}
          <Link to="/evenements/$slug" params={{ slug: e.slug }} className="after:absolute after:inset-0 hover:text-court">{e.title}</Link>
        </h3>
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {e.club ? (
            <Link to="/clubs/$slug" params={{ slug: e.club.slug }} className="relative z-10 truncate font-semibold text-court hover:underline">{e.club.name}</Link>
          ) : (
            <span className="truncate">{eventPlace(e)}</span>
          )}
        </p>
        <p className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{dateRange(e.startDate, e.endDate)} · {e.level}</p>
      </div>
    </li>
  );
}

export function NewsCard({ n }: { n: NewsSummary }) {
  return (
    <li data-reveal className="group relative flex flex-col overflow-hidden rounded-3xl border bg-card transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/9] overflow-hidden bg-court">
        {n.imageUrl ? (
          <img src={n.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="court-lines grid h-full place-items-center bg-gradient-to-br from-court to-navy">
            <span className="font-display text-2xl font-extrabold text-court-foreground/90">{n.source}</span>
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${n.scope === "tn" ? "bg-lime text-navy" : "bg-white text-navy"}`}>{n.scope === "tn" ? "Tunisie" : "International"}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="truncate">{n.source}</span>
          <span aria-hidden>·</span>
          <time dateTime={n.publishedOn} className="shrink-0">{newsDate(n)}</time>
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug">
          {/* Stretched link: the whole card opens the original article. */}
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0 group-hover:text-court">{n.title}</a>
        </h3>
        {n.summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.summary}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          {n.club ? (
            <Link to="/clubs/$slug" params={{ slug: n.club.slug }} className="relative z-10 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground hover:bg-accent">
              <MapPin className="h-3.5 w-3.5" />{n.club.name}
            </Link>
          ) : n.event ? (
            <Link to="/evenements/$slug" params={{ slug: n.event.slug }} className="relative z-10 inline-flex max-w-[70%] items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground hover:bg-accent">
              <Trophy className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{n.event.title}</span>
            </Link>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-court">Lire<ArrowUpRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </li>
  );
}

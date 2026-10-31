import { CalendarDays, ChevronDown, Clock, MapPin } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { dayLabel, earliestTimeToday, MAX_DAY, SEARCH_TIMES, toMinutes, upcomingTime } from "@/lib/availability";
import type { CityGroup } from "@/lib/clubs";

export type FreeCourtQuery = { day: number; time: string; city: string };

/** City, day and time of the free-court search, on /terrains and in the home hero. */
export function FreeCourtSearch({ value, cityGroups, onChange }: { value: FreeCourtQuery; cityGroups: CityGroup[]; onChange: (v: FreeCourtQuery) => void }) {
  // Today's past times are disabled. Read after mount: the server's clock and the visitor's can disagree.
  const [earliest, setEarliest] = useState<number | null>(null);
  useEffect(() => setEarliest(earliestTimeToday()), []);
  const change = (v: FreeCourtQuery) => onChange(earliest === null ? v : { ...v, time: upcomingTime(v.day, v.time, earliest) });
  // A time already past (e.g. the 19:00 default at 20:15) moves to the next one still offered.
  useEffect(() => {
    if (earliest === null) return;
    const time = upcomingTime(value.day, value.time, earliest);
    if (time !== value.time) onChange({ ...value, time });
  }, [earliest, value, onChange]);
  const select = "h-12 w-full cursor-pointer appearance-none rounded-2xl bg-muted pl-11 pr-11 font-semibold text-foreground outline-none";
  const icon = "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground";
  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-2 rounded-3xl bg-card p-2 shadow-lift sm:grid-cols-3">
      <Field label="Jour" icon={<CalendarDays aria-hidden className={icon} />}>
        <select value={value.day} onChange={(e) => change({ ...value, day: Number(e.target.value) })} className={select}>
          {Array.from({ length: MAX_DAY + 1 }, (_, d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
        </select>
      </Field>
      <Field label="Heure" icon={<Clock aria-hidden className={icon} />}>
        <select value={value.time} onChange={(e) => change({ ...value, time: e.target.value })} className={select}>
          {SEARCH_TIMES.map((t) => <option key={t} value={t} disabled={value.day === 0 && earliest !== null && toMinutes(t) < earliest}>{t}</option>)}
        </select>
      </Field>
       <Field label="Ville" icon={<MapPin aria-hidden className={icon} />}>
        <select value={value.city} onChange={(e) => change({ ...value, city: e.target.value })} className={select}>
          <option value="">Toutes les villes</option>
          {cityGroups.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      {icon}
      {children}
      <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}

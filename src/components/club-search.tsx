import { ChevronDown, Search } from "lucide-react";
import type { CityGroup } from "@/lib/clubs";

export function ClubSearch({ q, city, cityGroups, onChange }: { q: string; city: string; cityGroups: CityGroup[]; onChange: (v: { q: string; city: string }) => void }) {
  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-2 rounded-3xl bg-card p-2 shadow-lift sm:grid-cols-[1fr_200px]">
      <label className="flex items-center gap-3 rounded-2xl bg-muted px-4">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Rechercher un club</span>
        <input value={q} onChange={(e) => onChange({ q: e.target.value, city })} placeholder="Nom du club ou ville…" className="h-12 w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
      </label>
      <label className="relative">
        <span className="sr-only">Ville</span>
        <select value={city} onChange={(e) => onChange({ q, city: e.target.value })} className="h-12 w-full cursor-pointer appearance-none rounded-2xl bg-muted pl-4 pr-11 font-semibold text-foreground outline-none">
          <option value="">Toutes les villes</option>
          {cityGroups.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      </label>
    </form>
  );
}

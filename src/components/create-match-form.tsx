import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CalendarDays, CheckCircle2, Clock, MapPin, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CityOptions } from "@/components/city-options";
import { SelectField } from "@/components/select-field";
import { createMatch } from "@/functions/matches";
import { cityGroups, inArea } from "@/lib/clubs";
import { createMatchSchema, genderLabel, levelLabel, LEVELS, MAX_LEVEL_GAP, MAX_SPOTS, MIN_LEAD_MINUTES, TIMEZONE, tunisDate, tunisInstant, type CreateMatchInput } from "@/lib/matches";
import type { PlayerGender } from "@/db/schema";

type ClubChoice = { slug: string; name: string; city: string; region: string };
type Viewer = { name: string; avatarUrl: string | null; level: number; gender: PlayerGender; city: string | null };

const TIMES = Array.from({ length: 34 }, (_, i) => {
  const m = 7 * 60 + i * 30; // 07:00 → 23:30
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

/** The next two weeks, as Tunis dates. */
const DAYS = Array.from({ length: 14 }, (_, i) => tunisDate(new Date(Date.now() + i * 86_400_000)));

const dayParts = (date: string) => {
  const d = tunisInstant(date, "12:00");
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-TN", { ...o, timeZone: TIMEZONE }).format(d).replace(".", "");
  return { weekday: f({ weekday: "short" }), long: f({ weekday: "long", day: "numeric", month: "long" }), day: f({ day: "numeric" }), month: f({ month: "short" }) };
};

const endTime = (start: string, minutes: number) => {
  const [h, m] = start.split(":").map(Number);
  const t = (h! * 60 + m! + minutes) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const DURATIONS = [
  { value: 60, label: "1 h" },
  { value: 90, label: "1 h 30" },
  { value: 120, label: "2 h" },
] as const;

/**
 * The /matchs/creer form: numbered steps on the left and, on large screens, a live preview of the
 * match with the submit button on the right; on phones the summary and button stick to the bottom.
 */
export function CreateMatchForm({ clubs, viewer, defaults }: { clubs: ClubChoice[]; viewer: Viewer; defaults?: { city?: string; clubSlug?: string } }) {
  const navigate = useNavigate();
  const presetClub = clubs.find((c) => c.slug === defaults?.clubSlug);
  // The "Ville" select takes an area like every city filter ("Grand Tunis", "Tunis" with La Marsa…).
  const wanted = presetClub?.city || defaults?.city || viewer.city || "";
  const [area, setArea] = useState(clubs.some((c) => inArea(wanted, c)) ? wanted : (clubs[0]?.city ?? ""));
  const inPicked = clubs.filter((c) => inArea(area, c));
  // An area's own city first: "Tunis" starts on a club in Tunis itself rather than in La Marsa.
  const firstClub = (a: string) => (clubs.find((c) => c.city === a) ?? clubs.find((c) => inArea(a, c)))?.slug ?? "";
  const [values, setValues] = useState<CreateMatchInput>({
    clubSlug: presetClub?.slug ?? firstClub(area),
    date: DAYS[1]!,
    start: "19:00",
    durationMin: 90,
    gender: "mixed",
    // Starts on the player's own level; tapping other levels widens the range.
    levelMin: viewer.level,
    levelMax: viewer.level,
    // No default: the creator must say how many players they're missing (0 = not picked yet).
    spots: 0,
    courtBooked: false,
    membersOnly: true,
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CreateMatchInput>(k: K, v: CreateMatchInput[K]) => setValues((s) => ({ ...s, [k]: v }));
  const club = clubs.find((c) => c.slug === values.clubSlug);
  const day = dayParts(values.date);
  // Slots starting within the hour are disabled, as the server refuses them. Read after mount (the
  // server's clock and the visitor's can disagree) and every minute, for a form left open.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const tooSoon = (date: string, time: string) => now !== null && tunisInstant(date, time).getTime() < now + MIN_LEAD_MINUTES * 60_000;
  const dayFull = (date: string) => TIMES.every((t) => tooSoon(date, t));
  // A start already too soon (e.g. 19:00 today at 18:30) moves to the next slot still open, on a later day if needed.
  useEffect(() => {
    if (now === null || !tooSoon(values.date, values.start)) return;
    const date = DAYS.find((d) => !dayFull(d)) ?? values.date;
    setValues((s) => ({ ...s, date, start: TIMES.find((t) => !tooSoon(date, t)) ?? s.start }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, values.date, values.start]);
  const levels = values.levelMin === values.levelMax ? `${values.levelMin}` : `${values.levelMin}–${values.levelMax}`;

  // The range always contains the creator's level: a tap below it moves the minimum, above it the maximum.
  const pickLevel = (l: number) =>
    setValues((s) => (l < viewer.level ? { ...s, levelMin: l } : l > viewer.level ? { ...s, levelMax: l } : { ...s, levelMin: l, levelMax: l }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.spots) return setError("Indiquez combien de joueurs vous manquent.");
    const parsed = createMatchSchema.safeParse(values);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Formulaire incomplet.");
    setError(null);
    setSaving(true);
    try {
      const { id } = await createMatch({ data: parsed.data });
      toast.success("Match créé ! Les joueurs de ce niveau peuvent maintenant le rejoindre.");
      navigate({ to: "/matchs/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "La création a échoué.");
      setSaving(false);
    }
  }

  const field = "h-12 w-full rounded-xl border bg-background px-4 font-semibold outline-none transition-colors focus:border-court";
  const submitButton = (className: string) => (
    <button type="submit" disabled={saving || !values.clubSlug} className={`flex items-center justify-center gap-2 rounded-full bg-lime font-bold text-navy transition-[filter] hover:brightness-95 disabled:opacity-60 ${className}`}>
      <Plus className="h-5 w-5" />
      {saving ? "Création…" : "Créer le match"}
    </button>
  );
  const errorBox = error && <p className="flex items-start gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-semibold text-destructive-foreground shadow-md" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>;

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <div className="divide-y rounded-3xl border bg-card shadow-lift">
        <Step n={1} title="Où jouez-vous ?" hint="Le club où le match aura lieu.">
          <div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
            <Labelled label="Ville">
              <SelectField aria-label="Ville" value={area} onChange={(e) => { setArea(e.target.value); set("clubSlug", firstClub(e.target.value)); }} className={field}>
                <CityOptions groups={cityGroups(clubs)} />
              </SelectField>
            </Labelled>
            <Labelled label="Club">
              <SelectField aria-label="Club" value={values.clubSlug} onChange={(e) => set("clubSlug", e.target.value)} className={field}>
                {inPicked.map((c) => <option key={c.slug} value={c.slug}>{inPicked.some((o) => o.city !== c.city) ? `${c.name} · ${c.city}` : c.name}</option>)}
              </SelectField>
            </Labelled>
          </div>
          <Toggle checked={values.courtBooked} onChange={(v) => set("courtBooked", v)} label="Le terrain est déjà réservé" hint="Les joueurs savent que le créneau est assuré." />
        </Step>

        <Step n={2} title="Quand ?" hint="Dans les deux prochaines semaines.">
          <div role="radiogroup" aria-label="Jour" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8">
            {DAYS.map((d, i) => {
              const p = dayParts(d);
              const on = values.date === d;
              return (
                <button key={d} type="button" role="radio" aria-checked={on} disabled={dayFull(d)} onClick={() => set("date", d)} className={`flex w-[60px] shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-court bg-court text-court-foreground" : "bg-background hover:border-court"}`}>
                  <span className={`text-[11px] font-bold uppercase ${on ? "text-lime" : "text-muted-foreground"}`}>{i === 0 ? "Auj." : i === 1 ? "Dem." : p.weekday}</span>
                  <span className="font-display text-xl font-extrabold leading-tight">{p.day}</span>
                  <span className={`text-[11px] ${on ? "text-court-foreground/70" : "text-muted-foreground"}`}>{p.month}</span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labelled label="Début">
              <SelectField aria-label="Heure de début" value={values.start} onChange={(e) => set("start", e.target.value)} className={field}>
                {TIMES.map((t) => <option key={t} disabled={tooSoon(values.date, t)}>{t}</option>)}
              </SelectField>
            </Labelled>
            <Labelled label="Durée">
              <Segmented label="Durée" options={DURATIONS} value={values.durationMin} onChange={(v) => set("durationMin", v)} />
            </Labelled>
          </div>
        </Step>

        <Step n={3} title="Avec qui ?" hint="Seuls les joueurs dans cette fourchette pourront demander à rejoindre.">
          <Labelled label="Combien de joueurs vous manque-t-il ?">
            <Segmented
              label="Joueurs recherchés"
              options={Array.from({ length: MAX_SPOTS }, (_, i) => ({ value: i + 1, label: `${i + 1} joueur${i ? "s" : ""}` }))}
              value={values.spots}
              onChange={(v) => { set("spots", v); setError(null); }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {values.spots ? `Vous êtes ${4 - values.spots} sur le terrain, il en manque ${values.spots} pour jouer à 4.` : "Comptez-vous avec vos partenaires déjà trouvés : vous êtes 3, il en manque 1."}
            </p>
          </Labelled>
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Niveaux acceptés</span>
              <span className="text-sm text-muted-foreground">{levelLabel(values.levelMin)}{values.levelMax !== values.levelMin && ` → ${levelLabel(values.levelMax)}`}</span>
            </div>
            <div role="group" aria-label="Niveaux acceptés" className="grid grid-cols-8 gap-1.5">
              {LEVELS.map((l) => {
                const on = l.value >= values.levelMin && l.value <= values.levelMax;
                const mine = l.value === viewer.level;
                const reachable = Math.abs(l.value - viewer.level) <= MAX_LEVEL_GAP;
                return (
                  <button key={l.value} type="button" title={reachable ? l.label : "Trop loin de votre niveau"} aria-pressed={on} disabled={!reachable} onClick={() => pickLevel(l.value)} className={`relative h-12 rounded-xl font-display text-lg font-extrabold transition-colors ${on ? "bg-court text-court-foreground" : reachable ? "bg-muted text-muted-foreground hover:bg-secondary" : "cursor-not-allowed bg-muted/40 text-muted-foreground/35"} ${mine ? "ring-2 ring-navy ring-offset-2 ring-offset-card" : ""}`}>
                    {l.value}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Encadré : votre niveau ({viewer.level}). Vous pouvez ouvrir le match à un niveau en dessous et un au-dessus, pour des parties équilibrées.</p>
          </div>
          <Labelled label="Match">
            <Segmented
              label="Match"
              options={[{ value: "mixed", label: "Mixte" }, { value: viewer.gender, label: viewer.gender === "male" ? "Hommes" : "Femmes" }] as const}
              value={values.gender}
              onChange={(v) => set("gender", v)}
            />
          </Labelled>
          <Toggle checked={values.membersOnly} onChange={(v) => set("membersOnly", v)} label="Joueurs visibles par les membres uniquement" hint="Les visiteurs non connectés voient le match, mais pas qui y joue." />
          <Labelled label="Note pour les joueurs (facultatif)">
            <textarea aria-label="Note pour les joueurs" rows={3} maxLength={300} value={values.note} onChange={(e) => set("note", e.target.value)} placeholder="Ex. : partage du terrain 15 DT par joueur, balles fournies…" className={`${field} h-auto py-3 font-normal`} />
          </Labelled>
        </Step>
      </div>

      {/* Large screens: live preview of the match, with the submit button. */}
      <aside className="sticky top-24 hidden lg:block">
        <div className="court-lines relative overflow-hidden rounded-3xl bg-court p-6 text-court-foreground shadow-[0_28px_60px_-16px_oklch(0.55_0.13_255/0.6),0_8px_20px_-8px_oklch(0.27_0.09_264/0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Aperçu du match</p>
          <p className="mt-4 text-2xl font-extrabold leading-tight">{club?.name ?? "Choisissez un club"}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70"><MapPin className="h-4 w-4" />{club?.city ?? area}</p>
          <div className="mt-5 grid gap-2 text-sm">
            <p className="flex items-center gap-2 font-semibold capitalize"><CalendarDays className="h-4 w-4 text-lime" />{day.long}</p>
            <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-lime" />{values.start} – {endTime(values.start, values.durationMin)}</p>
            {values.courtBooked && <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-lime" />Terrain réservé</p>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-lime px-3 py-1 text-navy">Niveau {levels}</span>
            <span className="rounded-full bg-white/15 px-3 py-1">{genderLabel(values.gender)}</span>
          </div>
          <div className="mt-6 border-t border-white/15 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Joueurs · {values.spots ? `${4 - values.spots}/4` : "nombre à choisir"}</p>
            <div className="mt-3 flex items-center gap-2">
              {viewer.avatarUrl ? (
                <img src={viewer.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-11 w-11 rounded-full border-2 border-lime object-cover" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-lime bg-court font-bold">{viewer.name.slice(0, 1)}</span>
              )}
              {Array.from({ length: values.spots }, (_, i) => (
                <span key={i} className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-white/35 text-white/50"><Plus className="h-4 w-4" /></span>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {errorBox}
            {submitButton("h-12 w-full")}
          </div>
        </div>
      </aside>

      {/* Phones and tablets: summary and button stuck to the bottom of the screen. */}
      <div className="sticky bottom-0 z-20 -mx-4 bg-court px-4 pt-3 text-court-foreground shadow-[0_-8px_24px_rgb(0_0_0/0.15)] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {errorBox && <div className="mb-3">{errorBox}</div>}
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm leading-tight">
            <span className="block truncate font-bold capitalize">{day.weekday} {day.day} {day.month} · {values.start}</span>
            <span className="block truncate text-white/70">{club?.name ?? area} · niveau {levels}</span>
          </p>
          {submitButton("h-12 shrink-0 px-6")}
        </div>
      </div>
    </form>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 p-6 sm:p-8">
      <header className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-court font-display font-extrabold text-lime">{n}</span>
        <div>
          <h2 className="text-xl font-extrabold">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-12 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={`flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-colors ${value === o.value ? "bg-court text-court-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors ${checked ? "border-court bg-court/5" : "hover:bg-muted"}`}>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-court" : "bg-secondary"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

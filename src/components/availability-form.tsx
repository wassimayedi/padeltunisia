import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, UserRoundCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CityOptions } from "@/components/city-options";
import { Labelled, Step, Toggle } from "@/components/create-match-form";
import { PlayerCard } from "@/components/player-card";
import { SelectField } from "@/components/select-field";
import { makeMeAvailable, stopMyAvailability } from "@/functions/players";
import { cityGroups, inArea } from "@/lib/clubs";
import { TIMEZONE } from "@/lib/matches";
import { AVAILABILITY_DAYS, availableUntilFrom, MAX_AVAILABLE_CLUBS, MAX_NOTE_LENGTH, type MyAvailability } from "@/lib/players";
import type { PlayerGender } from "@/db/schema";

type ClubChoice = { slug: string; name: string; city: string; region: string };
type Viewer = { id: string; name: string; avatarUrl: string | null; level: number; gender: PlayerGender; city: string | null };

const dayLabel = (d: Date) => new Intl.DateTimeFormat("fr-TN", { weekday: "long", day: "numeric", month: "long", timeZone: TIMEZONE }).format(d);

/** Same label as the club select of the match form: "Nom · Ville" when the list spans several cities. */
export const clubOption = (c: ClubChoice, list: ClubChoice[]) => (list.some((o) => o.city !== c.city) ? `${c.name} · ${c.city}` : c.name);

/**
 * The /joueurs/disponible form, laid out like /matchs/creer: numbered steps on the left and, on large
 * screens, a live preview of the player's card with the button; on phones the buttons end the form.
 */
export function AvailabilityForm({ clubs, viewer, mine }: { clubs: ClubChoice[]; viewer: Viewer; mine: MyAvailability }) {
  const navigate = useNavigate();
  const available = mine.availableUntil !== null;
  const [anonymous, setAnonymous] = useState(mine.anonymous);
  const [chosen, setChosen] = useState(mine.clubSlugs);
  const [note, setNote] = useState(mine.note ?? "");
  // The "Ville" select takes an area like every city filter; it starts on the player's own city.
  const [area, setArea] = useState(viewer.city && clubs.some((c) => inArea(viewer.city!, c)) ? viewer.city : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bySlug = new Map(clubs.map((c) => [c.slug, c]));
  const addable = clubs.filter((c) => inArea(area, c) && !chosen.includes(c.slug));
  const full = chosen.length >= MAX_AVAILABLE_CLUBS;
  const until = available ? new Date(mine.availableUntil!) : null;

  const done = async (action: () => Promise<MyAvailability>, success: string) => {
    setError(null);
    setSaving(true);
    try {
      // /joueurs reloads the viewer's state in its loader when we navigate there.
      await action();
      toast.success(success);
      navigate({ to: "/joueurs" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'enregistrement a échoué, réessayez.");
      setSaving(false);
    }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    done(() => makeMeAvailable({ data: { anonymous, clubSlugs: chosen, note } }), available ? "Disponibilité mise à jour." : "Vous êtes disponible ! Les joueurs peuvent vous contacter.");
  };
  const stop = () => done(() => stopMyAvailability(), "Vous n'apparaissez plus dans la liste.");

  const field = "h-12 w-full rounded-xl border bg-background px-4 font-semibold outline-none transition-colors focus:border-court";
  const submitButton = (className: string, label: string) => (
    <button type="submit" disabled={saving} className={`flex items-center justify-center gap-2 rounded-full bg-lime font-bold text-navy transition-[filter] hover:brightness-95 disabled:opacity-60 ${className}`}>
      <UserRoundCheck className="h-5 w-5" />
      {saving ? "Enregistrement…" : label}
    </button>
  );
  const stopButton = (className: string) =>
    available && (
      <button type="button" onClick={stop} disabled={saving} className={`text-sm font-semibold underline underline-offset-4 disabled:opacity-60 ${className}`}>
        Ne plus être disponible
      </button>
    );
  const errorBox = error && <p className="flex items-start gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-semibold text-destructive-foreground shadow-md" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>;

  // minmax(0,1fr): a plain grid column grows to its content's min width, and a native select is as
  // wide as its longest option ("Club · Ville"), which pushed the form past phone screens.
  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 divide-y rounded-3xl border bg-card shadow-lift">
        {until && (
          <p className="flex items-center gap-2 p-6 text-sm font-semibold sm:px-8">
            <UserRoundCheck className="h-5 w-5 shrink-0 text-court" />
            Vous êtes disponible jusqu'au {dayLabel(until)}. Enregistrer prolonge de {AVAILABILITY_DAYS} jours.
          </p>
        )}

        <Step n={1} title="Comment apparaître ?" hint="Votre niveau, votre genre et votre ville sont toujours affichés.">
          <Toggle
            checked={anonymous}
            onChange={setAnonymous}
            label="Rester anonyme"
            hint="Votre nom et votre photo sont masqués. Les membres qui vous contactent voient votre numéro sur WhatsApp."
          />
        </Step>

        <Step n={2} title="Où aimeriez-vous jouer ?" hint={`Facultatif, ${MAX_AVAILABLE_CLUBS} clubs au maximum. Les joueurs peuvent filtrer par club.`}>
          <div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
            <Labelled label="Ville">
              <SelectField aria-label="Ville" value={area} onChange={(e) => setArea(e.target.value)} className={field}>
                <option value="">Toutes les villes</option>
                <CityOptions groups={cityGroups(clubs)} />
              </SelectField>
            </Labelled>
            <Labelled label="Ajouter un club">
              <SelectField aria-label="Ajouter un club" value="" disabled={full} onChange={(e) => e.target.value && setChosen((s) => [...s, e.target.value])} className={`${field} disabled:opacity-50`}>
                <option value="">{full ? `${MAX_AVAILABLE_CLUBS} clubs choisis` : "Choisir un club…"}</option>
                {addable.map((c) => <option key={c.slug} value={c.slug}>{clubOption(c, addable)}</option>)}
              </SelectField>
            </Labelled>
          </div>
          {chosen.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Clubs choisis">
              {chosen.map((slug) => {
                const c = bySlug.get(slug);
                return (
                  <li key={slug} className="flex items-center gap-1.5 rounded-full bg-court py-1.5 pl-4 pr-2 text-sm font-semibold text-court-foreground">
                    {c?.name ?? slug}
                    {c && <span className="text-court-foreground/60">· {c.city}</span>}
                    <button type="button" aria-label={`Retirer ${c?.name ?? slug}`} onClick={() => setChosen((s) => s.filter((x) => x !== slug))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/20">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        <Step n={3} title="Quand êtes-vous dispo ?" hint="Facultatif : en quelques mots, sur votre carte.">
          <Labelled label={`Vos disponibilités · ${note.length}/${MAX_NOTE_LENGTH}`}>
            <textarea
              aria-label="Vos disponibilités"
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. : que les week-ends, tous les jours à 19h sauf le week-end…"
              className={`${field} h-auto py-3 font-normal`}
            />
          </Labelled>
          {anonymous && <p className="text-xs text-muted-foreground">En anonyme, n'indiquez ni nom ni numéro dans votre note.</p>}
        </Step>

        {/* Phones and tablets: the buttons end the form (large screens have them next to the preview). */}
        <div className="grid gap-3 p-6 sm:p-8 lg:hidden">
          {errorBox}
          {submitButton("h-12 w-full", available ? `Enregistrer et prolonger ${AVAILABILITY_DAYS} jours` : "Me rendre disponible")}
          {stopButton("text-muted-foreground hover:text-foreground")}
        </div>
      </div>

      {/* Large screens: the card as other players will see it, with the button. */}
      <aside className="sticky top-24 hidden lg:block">
        <div className="court-lines relative overflow-hidden rounded-3xl bg-court p-6 text-court-foreground shadow-[0_28px_60px_-16px_oklch(0.55_0.13_255/0.6),0_8px_20px_-8px_oklch(0.27_0.09_264/0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Aperçu de votre carte</p>
          {/* Solid background: the "mine" card is translucent and its muted text vanished on the blue. */}
          <div className="mt-4 rounded-3xl bg-card text-foreground">
            <PlayerCard
              mine
              player={{
                id: viewer.id,
                name: anonymous ? null : viewer.name,
                avatarUrl: anonymous ? null : viewer.avatarUrl,
                level: viewer.level,
                gender: viewer.gender,
                city: viewer.city,
                clubs: chosen.flatMap((slug) => (bySlug.has(slug) ? [{ slug, name: bySlug.get(slug)!.name }] : [])),
                note: note.trim() || null,
                availableUntil: availableUntilFrom(),
              }}
            />
          </div>
          <div className="mt-6 grid gap-3">
            {errorBox}
            {submitButton("h-12 w-full", available ? `Enregistrer et prolonger ${AVAILABILITY_DAYS} jours` : "Me rendre disponible")}
            {stopButton("text-court-foreground/80 hover:text-court-foreground")}
          </div>
        </div>
      </aside>

    </form>
  );
}

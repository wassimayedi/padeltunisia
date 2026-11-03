import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { CityOptions } from "@/components/city-options";
import { SelectField } from "@/components/select-field";
import { WhatsappIcon } from "@/components/whatsapp-icon";
import { LevelSelect } from "@/components/level-select";
import { PlayerAvatar } from "@/components/match-card";
import { getViewer } from "@/functions/auth";
import { getMyProfile, updateMyProfile } from "@/functions/matches";
import { cityGroups, inArea } from "@/lib/clubs";
import { levelLabel, profileSchema, safeNextPath, type ProfileInput } from "@/lib/matches";
import { pageTitle } from "@/lib/site";

export const Route = createFileRoute("/profil")({
  validateSearch: zodValidator(z.object({ next: fallback(z.string(), "").default("") })),
  loader: async ({ location }) => {
    if (!(await getViewer())) throw redirect({ to: "/connexion", search: { next: location.href, erreur: 0 } });
    return getMyProfile();
  },
  // Always show the saved profile: a cached copy from an earlier visit would fill the form with old values.
  gcTime: 0,
  head: () => ({ meta: [{ title: pageTitle("Mon profil") }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

type Fields = Omit<ProfileInput, "level" | "gender"> & { level: number | null; gender: ProfileInput["gender"] | null };

function ProfilePage() {
  const profile = Route.useLoaderData();
  // The form copies the profile into its state once: start it over when fresh data arrives.
  return <ProfileForm key={profile.updatedAt.getTime()} profile={profile} />;
}

type Profile = Awaited<ReturnType<typeof getMyProfile>>;

function ProfileForm({ profile }: { profile: Profile }) {
  const { next } = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Fields>({
    name: profile.name,
    phone: profile.phone,
    phoneCountryCode: profile.phoneCountryCode,
    gender: profile.gender,
    level: profile.level,
    region: profile.region,
    city: profile.city,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Fields] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateMyProfile({ data: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ["viewer"] });
      toast.success("Profil enregistré.");
      await router.invalidate();
      // `next` may carry a query string (e.g. /matchs/creer?city=Tunis): push it as a full href.
      router.history.push(safeNextPath(next || "/matchs"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  }

  const field = "h-12 w-full rounded-2xl border bg-background px-4 outline-none focus:border-court";
  const err = (k: keyof Fields) => errors[k] && <p className="mt-1 text-sm font-semibold text-destructive">{errors[k]}</p>;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center gap-4">
        <PlayerAvatar player={profile} className="h-16 w-16" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-court">Profil joueur</p>
          <h1 className="truncate text-3xl font-extrabold">{profile.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {profile.level ? `Niveau ${profile.level} · ${levelLabel(profile.level)}` : profile.email}
          </p>
        </div>
      </div>
      {!profile.complete && (
        <p className="mt-6 rounded-2xl bg-lime/30 px-4 py-3 text-sm font-semibold text-navy">
          Indiquez votre téléphone, votre genre et votre niveau pour créer ou rejoindre un match.
        </p>
      )}
      <form onSubmit={submit} noValidate className="mt-8 grid gap-6">
        <div>
          <label htmlFor="name" className="mb-2 block font-semibold">Nom affiché</label>
          <input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} className={field} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 flex items-center gap-2 font-semibold"><WhatsappIcon className="h-5 w-5 text-[#25D366]" />Téléphone WhatsApp</label>
          <div className="flex gap-2">
            {/* The "+" is shown, not typed: the code is stored as digits only. */}
            <div className="relative w-24 shrink-0">
              <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">+</span>
              <input aria-label="Indicatif pays" value={values.phoneCountryCode} onChange={(e) => set("phoneCountryCode", e.target.value.replace(/\D/g, "").slice(0, 4))} className={`${field} pl-8`} inputMode="numeric" />
            </div>
            <input id="phone" type="tel" autoComplete="tel-national" value={values.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, ""))} placeholder="22 123 456" className={field} inputMode="numeric" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Montré uniquement aux joueurs de vos matchs. Les notifications arrivent sur WhatsApp et par e-mail.</p>
          {err("phone") ?? err("phoneCountryCode")}
        </div>
        <fieldset>
          <legend className="mb-2 font-semibold">Genre</legend>
          <div className="flex gap-2">
            {(["male", "female"] as const).map((g) => (
              <label key={g} className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-2xl border font-semibold ${values.gender === g ? "border-court bg-court/10" : "hover:bg-muted"}`}>
                <input type="radio" name="gender" checked={values.gender === g} onChange={() => set("gender", g)} className="sr-only" />
                {g === "male" ? "Homme" : "Femme"}
              </label>
            ))}
          </div>
          {err("gender")}
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold">Votre niveau</legend>
          <LevelSelect value={values.level} onChange={(l) => set("level", l)} />
          {errors.level && <p className="mt-1 text-sm font-semibold text-destructive">Choisissez votre niveau.</p>}
        </fieldset>
        <div>
          <label htmlFor="city" className="mb-2 block font-semibold">Ville où vous jouez</label>
          <SelectField
            id="city"
            value={values.city}
            onChange={(e) => setValues((s) => ({ ...s, city: e.target.value, region: profile.clubs.find((c) => inArea(e.target.value, c))?.region ?? "" }))}
            className={field}
          >
            <option value="" disabled>Choisissez votre ville</option>
            <CityOptions groups={cityGroups(profile.clubs)} />
          </SelectField>
          {err("city")}
        </div>
        <button type="submit" disabled={saving} className="h-12 rounded-full bg-court font-bold text-court-foreground disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}

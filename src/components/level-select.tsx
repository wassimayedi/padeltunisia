import { LEVELS } from "@/lib/matches";

/** The 1–8 scale with a one-line description per level, as large tap targets. */
export function LevelSelect({ value, onChange, name = "level" }: { value: number | null; onChange: (level: number) => void; name?: string }) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {LEVELS.map((l) => (
        <label
          key={l.value}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${value === l.value ? "border-court bg-court/10" : "hover:bg-muted"}`}
        >
          <input type="radio" name={name} value={l.value} checked={value === l.value} onChange={() => onChange(l.value)} className="sr-only" />
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-lg font-extrabold ${value === l.value ? "bg-court text-court-foreground" : "bg-muted"}`}>{l.value}</span>
          <span>
            <span className="block font-bold">{l.label}</span>
            <span className="block text-xs text-muted-foreground">{l.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

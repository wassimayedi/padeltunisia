import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { submitContact } from "@/functions/contact";
import { CONTACT_TOPICS, contactSchema, type ContactInput } from "@/lib/contact";

type Fields = Omit<ContactInput, "openedAt">;
type Errors = Partial<Record<keyof Fields, string>>;

const field = "h-12 w-full rounded-2xl border bg-background px-4 text-foreground outline-none transition-colors focus:border-court";
const label = "mb-1.5 block text-sm font-semibold";

export function ContactForm({ topic = "autre", organization = "" }: { topic?: Fields["topic"]; organization?: string }) {
  const [values, setValues] = useState<Fields>({ topic, name: "", email: "", phone: "", organization, message: "", website: "" });
  const [openedAt] = useState(() => Date.now());
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failure, setFailure] = useState("");

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const parsed = contactSchema.safeParse({ ...values, openedAt });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Fields] ??= issue.message;
      setErrors(next);
      return;
    }
    setState("sending");
    try {
      await submitContact({ data: parsed.data });
      setState("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setFailure(msg.startsWith("Trop de messages") ? msg : "L'envoi a échoué. Réessayez, ou écrivez-nous directement par e-mail.");
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-court" />
        <h2 className="mt-4 text-2xl font-bold">Message envoyé, merci !</h2>
        <p className="mt-2 text-muted-foreground">Nous vous répondons à {values.email} dans les meilleurs délais.</p>
      </div>
    );
  }

  const err = (k: keyof Fields) => errors[k] && <p className="mt-1 text-sm font-semibold text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-3xl border bg-card p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Envoyer un message</h2>

      <div>
        <label htmlFor="topic" className={label}>Sujet</label>
        <select id="topic" value={values.topic} onChange={(e) => set("topic", e.target.value as Fields["topic"])} className={`${field} cursor-pointer`}>
          {CONTACT_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>Nom *</label>
          <input id="name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} className={field} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="email" className={label}>E-mail *</label>
          <input id="email" type="email" autoComplete="email" value={values.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} className={field} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="phone" className={label}>Téléphone <span className="font-normal text-muted-foreground">(facultatif)</span></label>
          <input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} className={field} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="organization" className={label}>Club ou organisation <span className="font-normal text-muted-foreground">(facultatif)</span></label>
          <input id="organization" autoComplete="organization" value={values.organization} onChange={(e) => set("organization", e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="message" className={label}>Message *</label>
        <textarea id="message" rows={6} value={values.message} onChange={(e) => set("message", e.target.value)} aria-invalid={!!errors.message} className={`${field} h-auto py-3`} />
        {err("message")}
      </div>

      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Site web</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      {state === "failed" && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">{failure}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">Vos coordonnées servent uniquement à vous répondre.</p>
        <button type="submit" disabled={state === "sending"} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-opacity disabled:opacity-60">
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {state === "sending" ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}

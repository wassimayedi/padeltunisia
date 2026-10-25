import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CONSENT_REOPEN_EVENT, readConsent, saveConsent, type Consent } from "@/lib/consent";

/** Bottom banner asking for analytics consent; only rendered when GA is configured. */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read after mount: storage isn't available during server rendering.
    setOpen(readConsent() === null);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  if (!open) return null;
  const choose = (value: Consent) => {
    saveConsent(value);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-live="polite" aria-label="Mesure d'audience" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-3xl border bg-card p-5 shadow-lift animate-in fade-in slide-in-from-bottom-4 sm:inset-x-6 sm:p-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-bold text-foreground">Mesure d'audience.</span> Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages sont lues et
        améliorer le site. Aucune publicité, aucune revente.{" "}
        <Link to="/confidentialite" className="font-semibold text-court underline">En savoir plus</Link>
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => choose("denied")} className="h-10 rounded-full bg-secondary px-5 text-sm font-bold text-secondary-foreground">Refuser</button>
        <button type="button" onClick={() => choose("granted")} className="h-10 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">Accepter</button>
      </div>
    </div>
  );
}

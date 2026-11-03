import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PlayerAvatar } from "@/components/match-card";
import { getViewer, signOut, startGoogleLogin } from "@/functions/auth";

export const viewerQuery = { queryKey: ["viewer"], queryFn: () => getViewer(), staleTime: 60_000 } as const;

/** Sends the browser to Google, then back to `next`. */
export async function loginWithGoogle(next: string) {
  const { url } = await startGoogleLogin({ data: { next } });
  window.location.assign(url);
}

export function GoogleButton({ next, label = "Continuer avec Google", className = "" }: { next: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        loginWithGoogle(next).catch((err) => {
          console.error(err);
          toast.error("Connexion Google indisponible, réessayez.");
          setBusy(false);
        });
      }}
      className={`inline-flex h-12 items-center justify-center gap-3 rounded-full border bg-white px-6 font-semibold text-navy shadow-sm transition hover:shadow-md disabled:opacity-60 ${className}`}
    >
      <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {busy ? "Redirection…" : label}
    </button>
  );
}

/** Header entry: "Se connecter", or the player's avatar with links to their matches and profile. */
export function AccountButton({ light = false }: { light?: boolean }) {
  const { data: viewer, isPending } = useQuery(viewerQuery);
  const pathname = useRouterState({ select: (s) => s.location.href });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  if (isPending) return <span className="h-10 w-10" />;
  if (!viewer)
    return (
      <Link to="/connexion" search={{ next: pathname }} className={`rounded-full px-4 py-2 text-sm font-semibold ${light ? "bg-white/15 text-white" : "bg-navy text-primary-foreground"}`}>
        Se connecter
      </Link>
    );
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Mon compte" className="grid h-10 w-10 place-items-center rounded-full">
        <PlayerAvatar player={viewer} className="h-9 w-9" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border bg-card p-2 text-sm shadow-lift" onClick={() => setOpen(false)}>
          <p className="truncate px-3 py-2 font-bold">{viewer.name}</p>
          <Link to="/mes-matchs" className="block rounded-xl px-3 py-2 font-semibold hover:bg-muted">Mes matchs</Link>
          <Link to="/profil" className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold hover:bg-muted"><User className="h-4 w-4" />Mon profil</Link>
          <button
            onClick={async () => {
              await signOut();
              await queryClient.invalidateQueries({ queryKey: ["viewer"] });
              await router.invalidate();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

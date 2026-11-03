import { Link } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";

/** Link from club and city pages to /matchs, filtered on the city: players land where they play. */
export function FindMatchCta({ city, className = "" }: { city: string; className?: string }) {
  return (
    <Link to="/matchs" search={{ city }} className={`group flex items-center gap-4 rounded-3xl bg-court p-6 text-court-foreground ${className}`}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime text-navy"><Users className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">Trouver un match de padel à {city}</span>
        <span className="block text-sm text-court-foreground/80">Des joueurs de votre niveau cherchent des partenaires.</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

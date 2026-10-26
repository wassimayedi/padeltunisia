import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL, SITE_NAME } from "@/lib/site";
import { Link } from "@tanstack/react-router";
import { Mail, Menu, Phone, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/clubs", label: "Clubs" },
  { to: "/articles", label: "Actualités" },
  { to: "/evenements", label: "Événements" },
  { to: "/guide", label: "Guide du padel" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
      <img src="/logo.webp" alt="" width={28} height={28} className="h-7 w-7" />
      <span>Padel<span className="text-court">Tunisia</span></span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden gap-1 md:flex" aria-label="Navigation principale">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-secondary md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="animate-in slide-in-from-top-2 fade-in border-t px-4 pb-4 md:hidden" aria-label="Navigation mobile">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block border-b py-4 font-display text-2xl font-bold">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-navy text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-extrabold">Padel<span className="text-lime">Tunisia</span></p>
          <p className="mt-3 text-sm text-primary-foreground/70">L'annuaire et le média du padel en Tunisie : clubs, actualités, tournois et guides.</p>
        </div>
        <nav aria-label="Pied de page" className="grid content-start gap-2 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-lime">Explorer</p>
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-primary-foreground/80 hover:text-lime">{n.label}</Link>
          ))}
        </nav>
        <nav aria-label="Informations" className="grid content-start gap-2 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-lime">Informations</p>
          <Link to="/contact" className="text-primary-foreground/80 hover:text-lime">Contact</Link>
          <Link to="/mentions-legales" className="text-primary-foreground/80 hover:text-lime">Mentions légales</Link>
          <Link to="/confidentialite" className="text-primary-foreground/80 hover:text-lime">Confidentialité</Link>
        </nav>
        <div className="grid content-start gap-2 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-lime">Contact</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-primary-foreground/80 hover:text-lime"><Mail className="h-4 w-4" />{CONTACT_EMAIL}</a>
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-2 text-primary-foreground/80 hover:text-lime"><Phone className="h-4 w-4" />{CONTACT_PHONE}</a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-primary-foreground/60">© {new Date().getFullYear()} {SITE_NAME}. Les logos et visuels restent la propriété de leurs titulaires.</p>
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section className="court-lines relative overflow-hidden bg-court text-court-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{title}</h1>
        <p className="mt-4 max-w-xl text-court-foreground/80">{intro}</p>
      </div>
    </section>
  );
}

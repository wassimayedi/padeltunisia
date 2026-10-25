import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import court from "@/assets/padel-court.png";
import { ClubSearch } from "./club-search";
import type { CityGroup } from "@/lib/clubs";

export function Hero({ stats, cityGroups }: { stats: { clubs: number; courts: number; cities: number }; cityGroups: CityGroup[] }) {
  const root = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [s, setS] = useState({ q: "", city: "" });

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from("[data-hero-img]", { scale: 1.25, duration: 2.2 })
          .from("[data-word]", { yPercent: 110, duration: 1.1, stagger: 0.07 }, 0.2)
          .from("[data-hero-fade]", { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.6);
        // Ball rally across the court
        gsap.timeline({ repeat: -1, delay: 1 })
          .to("[data-ball]", { x: "62vw", y: "-18vh", duration: 1.1, ease: "power1.inOut" })
          .to("[data-ball]", { x: "18vw", y: "8vh", duration: 1.1, ease: "power1.inOut" })
          .to("[data-ball]", { x: "0vw", y: "0vh", duration: 1.1, ease: "power1.inOut" });
        gsap.to("[data-hero-img]", { yPercent: 18, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
        el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
          const o = { v: 0 };
          gsap.to(o, { v: Number(n.dataset["count"]), duration: 2, delay: 0.8, ease: "power2.out", onUpdate: () => (n.textContent = Math.round(o.v).toString()) });
        });
      }, el);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  const go = (v: { q: string; city: string }) => setS(v);
  const title = ["Trouvez", "votre", "terrain", "de", "padel", "en", "Tunisie."];

  return (
    <section ref={root} className="relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden text-court-foreground">
      <img data-hero-img src={court} alt="Terrain de padel bleu entouré de vitres" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="court-overlay absolute inset-0 -z-10" />
      <span data-ball aria-hidden className="pointer-events-none absolute bottom-[38%] left-[12%] h-5 w-5 rounded-full bg-lime shadow-glow" />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-28 sm:pb-16">
        {/* <p data-hero-fade className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-lime" /> Annuaire n°1 du padel
        </p> */}
        <h1 className="text-[clamp(2rem,6.5vw,4.5rem)] font-extrabold leading-[0.95]">
          {title.map((w, i) => (
            <Fragment key={i}>
              {/* Desktop: break before "padel" so the title sits on two lines */}
              {w === "padel" && <br className="hidden md:inline" />}
              <span className="inline-block overflow-hidden pb-1 align-bottom">
                <span data-word className={`inline-block ${w === "padel" ? "text-lime" : ""}`}>{w}&nbsp;</span>
              </span>
            </Fragment>
          ))}
        </h1>
        <p data-hero-fade className="mt-5 max-w-lg text-base text-court-foreground/85 sm:text-lg">
          Clubs, tournois, actualités et guides : tout le padel tunisien et international au même endroit.
        </p>
        <div data-hero-fade className="mt-8 max-w-2xl">
          <ClubSearch q={s.q} city={s.city} cityGroups={cityGroups} onChange={go} />
          <button onClick={() => navigate({ to: "/clubs", search: { q: s.q, city: s.city } })} className="mt-3 h-12 w-full rounded-2xl bg-lime px-6 font-bold text-navy transition-transform active:scale-95 sm:w-auto">
            Rechercher un club →
          </button>
        </div>
        <dl data-hero-fade className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-court-foreground/20 pt-6">
          {[["Clubs", stats.clubs], ["Terrains", stats.courts], ["Villes", stats.cities]].map(([l, v]) => (
            <div key={l}>
              <dt className="text-xs uppercase tracking-widest text-court-foreground/70">{l}</dt>
              <dd className="font-display text-3xl font-extrabold" data-count={v}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

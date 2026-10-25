import { useEffect, useRef, type ReactNode } from "react";

/** Lenis smooth scrolling synced with GSAP ticker. Client-only, lazily loaded. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      // StrictMode runs effects twice; bail if cleanup already ran during the import.
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return null;
}

/** Staggered scroll reveal for children marked with [data-reveal]. */
export function Reveal({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "ul" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const items = el.querySelectorAll("[data-reveal]");
        gsap.from(items.length ? items : el, {
          y: 40,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          // Drop GSAP's inline transform/opacity afterwards so CSS hover effects work again.
          clearProps: "all",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      }, el);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  );
}

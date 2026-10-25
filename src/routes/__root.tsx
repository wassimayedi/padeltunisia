import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { absoluteUrl, CONTACT_EMAIL, CONTACT_PHONE_TEL, SITE_NAME } from "@/lib/site";
import { getPublicConfig } from "@/functions/config";
import { gtagBootScript } from "@/lib/consent";
import { ConsentBanner } from "@/components/consent-banner";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SmoothScroll } from "@/components/motion";

// Runs before first paint: animated elements start hidden (see styles.css) instead of
// flashing visible → hidden → animated. If GSAP still hasn't started 3s after the page has
// fully loaded (blocked or failed script), the class is dropped so content shows anyway.
// Counting from "load" rather than from now keeps slow networks from tripping it early.
// Skipped for reduced motion.
const MOTION_BOOT = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var d=document.documentElement;d.classList.add("motion");addEventListener("load",function(){setTimeout(function(){if(!window.__motionReady)d.classList.remove("motion")},3000)})}catch(e){}})()`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Balle hors du terrain</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Cette page n'a pas pu se charger</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Réessayer
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium text-foreground">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getPublicConfig(),
  // Settings don't change between navigations: load once.
  staleTime: Infinity,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#13295c" },
      { title: "PadelTunisia — Clubs, tournois et actualités du padel en Tunisie" },
      { name: "description", content: "Annuaire des clubs de padel en Tunisie, actualités, événements et guides." },
      { property: "og:site_name", content: "PadelTunisia" },
      { property: "og:locale", content: "fr_TN" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Default share image; pages with their own og:image override it.
      { property: "og:image", content: absoluteUrl("/og-default.png") },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Manrope:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      ...(loaderData?.gaId
        ? [{ children: gtagBootScript(loaderData.gaId) }, { src: `https://www.googletagmanager.com/gtag/js?id=${loaderData.gaId}`, async: true }]
        : []),
      {
        type: "application/ld+json",
        children: JSON.stringify([
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/"), inLanguage: "fr" },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            logo: absoluteUrl("/logo.webp"),
            email: CONTACT_EMAIL,
            contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: CONTACT_EMAIL, telephone: CONTACT_PHONE_TEL, areaServed: "TN", availableLanguage: ["fr", "ar"] },
          },
        ]),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The motion script below adds a class to <html> before hydration.
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { gaId } = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll />
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter analytics={!!gaId} />
      {gaId && <ConsentBanner />}
    </QueryClientProvider>
  );
}

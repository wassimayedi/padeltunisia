/** Analytics consent, remembered in the visitor's browser. */
export type Consent = "granted" | "denied";

export const CONSENT_KEY = "analytics-consent";
/** Fired to reopen the banner (footer "Cookies" link). */
export const CONSENT_REOPEN_EVENT = "consent:reopen";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private mode or blocked storage: the choice applies to this visit only.
  }
  window.gtag?.("consent", "update", { analytics_storage: value });
}

/**
 * Inline <head> script: Consent Mode v2 defaults (everything denied unless the visitor
 * accepted before), then GA4 config. gtag.js itself loads separately with `async`.
 */
export const gtagBootScript = (gaId: string) =>
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
  `var c=null;try{c=localStorage.getItem(${JSON.stringify(CONSENT_KEY)})}catch(e){}` +
  `gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:c==="granted"?"granted":"denied"});` +
  `gtag("js",new Date());gtag("config",${JSON.stringify(gaId)});`;

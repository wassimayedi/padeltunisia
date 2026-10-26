/** Public origin, used for absolute URLs in structured data and social tags. */
export const SITE_URL = (import.meta.env["VITE_SITE_URL"] ?? "https://padeltunisia.tn").replace(/\/$/, "");

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const SITE_NAME = "PadelTunisia";

/** "<main> | PadelTunisia", without the suffix when it would pass ~60 characters (where Google cuts titles). */
export const pageTitle = (main: string) => {
  const full = `${main} | ${SITE_NAME}`;
  return full.length <= 60 ? full : main;
};
export const CONTACT_EMAIL = "contact@padeltunisia.tn";
/** Display format; `CONTACT_PHONE_TEL` is the tel: link target. */
export const CONTACT_PHONE = "+216 22 884 456";
export const CONTACT_PHONE_TEL = "+21622884456";

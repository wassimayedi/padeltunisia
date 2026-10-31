// Real photos for magazine covers, from the Pixabay API (free key: PIXABAY_API_KEY). Pixabay asks
// to download images rather than hotlink them, and to show where they come from: each photo comes
// with its credit, shown under the cover.
import sharp from "sharp";

import { download } from "./images.ts";

type PixabayHit = { pageURL: string; user: string; largeImageURL: string };

async function search(key: string, query: string) {
  const url = new URL("https://pixabay.com/api/");
  url.search = new URLSearchParams({
    key,
    q: query.slice(0, 100),
    image_type: "photo",
    orientation: "horizontal",
    safesearch: "true",
    min_width: "1200",
    per_page: "50",
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Pixabay answered ${response.status}`);
  return ((await response.json()) as { hits: PixabayHit[] }).hits;
}

/**
 * A photo for `query` (then broader padel searches) that no article uses yet, cropped to the
 * 1200×630 cover format; null without a key or when nothing new is found. `used` holds the
 * Pixabay page URLs already taken.
 */
export async function stockCover(query: string | undefined, used: Set<string>) {
  const key = process.env["PIXABAY_API_KEY"];
  if (!key) return null;
  const queries = [query, "padel", "padel racket"].filter(
    (q): q is string => !!q?.trim(),
  );
  for (const q of new Set(queries)) {
    const photo = (await search(key, q)).find((p) => !used.has(p.pageURL));
    if (photo) {
      const { data } = await download(photo.largeImageURL);
      return {
        // "attention" keeps the most detailed part of the photo (players, racket, ball) in frame.
        data: await sharp(data)
          .resize(1200, 630, { fit: "cover", position: "attention" })
          .toBuffer(),
        credit: { name: photo.user, url: photo.pageURL },
      };
    }
  }
  return null;
}

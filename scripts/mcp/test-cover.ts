// Dry run of the magazine cover: Pixabay photo for a search, or the generated title cover when
// Pixabay can't give one, exactly as add_magazine_article does. Nothing is written to the database
// or to uploads/: the image goes to /tmp. Reads PIXABAY_API_KEY from the environment.
// Usage: node scripts/mcp/test-cover.ts "padel racket ball" ["Article title"]
import { writeFile } from "node:fs/promises";

import { renderCover } from "./cover.ts";
import { toWebp } from "./images.ts";
import { stockCover } from "./stock.ts";

const [query = "padel", title = "Test de couverture PadelTunisia"] =
  process.argv.slice(2);

let failure: string | null = null;
const photo = await stockCover(query, new Set()).catch((error: unknown) => {
  failure = error instanceof Error ? error.message : String(error);
  return null;
});
const cover = await toWebp(
  photo?.data ?? (await renderCover({ title, category: "Guide" })),
  "magazine",
  "test-cover",
);
const out = "/tmp/test-cover.webp";
await writeFile(out, cover.data);

console.log(
  photo
    ? `Pixabay photo by ${photo.credit.name} (${photo.credit.url})`
    : `Generated title cover: ${
        failure ??
        (process.env["PIXABAY_API_KEY"]
          ? "no Pixabay photo for this search"
          : "PIXABAY_API_KEY is not set")
      }`,
);
console.log(`Saved ${cover.width}×${cover.height} image to ${out}`);

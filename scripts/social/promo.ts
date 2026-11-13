// Daily promotional story about a site feature, on the Facebook Page and Instagram (stories only,
// no feed post). Picks the message from promos.ts that was posted longest ago (or never), renders
// the story image, publishes it and records the ids in social_promos: one promo per Tunis day,
// nothing published twice, and a failed target is retried by a later run the same day.
// Usage: npm run social:promo [-- --dry-run]   (dry run writes the story image to logs/social/)
import { mkdir, writeFile } from "node:fs/promises";

import { eq, max } from "drizzle-orm";

import { socialPromos, type SocialPromo } from "../../src/db/schema.ts";
import { db } from "../mcp/config.ts";
import { renderSocialImage, type SocialFormat } from "./image.ts";
import { storyToFacebook, storyToInstagram } from "./meta.ts";
import { loadPromoStats, promos } from "./promos.ts";
import { stockPhoto } from "../mcp/stock.ts";
import { saveSocialImage } from "./upload.ts";

const dryRun = process.argv.includes("--dry-run");
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Africa/Tunis",
});

/** Background photo for the promo, or undefined (plain court background) when none can be had. */
async function promoPhoto(query: string) {
  try {
    const photo = await stockPhoto(query);
    if (!photo)
      console.warn(
        "promo photo: no PIXABAY_API_KEY or no result, using the plain background",
      );
    return photo ?? undefined;
  } catch (error) {
    console.warn(`promo photo: ${String(error)}, using the plain background`);
    return undefined;
  }
}

/** The promo to post today: least recently posted first, never-posted ones before all others. */
async function pickPromo(stats: Awaited<ReturnType<typeof loadPromoStats>>) {
  const lastPosted = new Map(
    (
      await db
        .select({ key: socialPromos.promoKey, day: max(socialPromos.day) })
        .from(socialPromos)
        .groupBy(socialPromos.promoKey)
    ).map((row) => [row.key, row.day ?? ""]),
  );
  return promos
    .map((promo, order) => ({ promo, order, content: promo.build(stats) }))
    .filter((c) => c.content !== null)
    .sort(
      (a, b) =>
        (lastPosted.get(a.promo.key) ?? "").localeCompare(
          lastPosted.get(b.promo.key) ?? "",
        ) || a.order - b.order,
    )[0];
}

const [existing] = await db
  .select()
  .from(socialPromos)
  .where(eq(socialPromos.day, today));
// Stories only: the post id columns stay in social_promos but are no longer filled.
const targets = [
  "facebookStoryId",
  "instagramStoryId",
] as const satisfies readonly (keyof SocialPromo)[];

if (existing && targets.every((column) => existing[column])) {
  console.log(`promo ${today}: already published (${existing.promoKey})`);
  await db.$client.end();
  process.exit(0);
}

const stats = await loadPromoStats(today);
// A run later in the day finishes the promo already chosen instead of starting another.
const chosen = existing
  ? (() => {
      const promo = promos.find((p) => p.key === existing.promoKey);
      const content = promo?.build(stats);
      return promo && content ? { promo, content } : undefined;
    })()
  : await pickPromo(stats);

if (!chosen?.content) {
  console.error(
    `promo ${today}: nothing to post${existing ? ` (${existing.promoKey} no longer available)` : ""}`,
  );
  await db.$client.end();
  process.exit(existing ? 1 : 0);
}

const { promo, content } = chosen;
console.log(`promo ${today}: ${promo.key}${dryRun ? " (dry run)" : ""}`);
const photo = await promoPhoto(promo.photoQuery);
if (photo) console.log(`photo: ${photo.credit.url}`);
const render = (format: SocialFormat) =>
  renderSocialImage({
    title: content.title,
    category: promo.category,
    excerpt: content.text,
    cta: content.cta,
    imageData: photo?.data ?? null,
    format,
  });

if (dryRun) {
  const file = `logs/social/promo-${today}-${promo.key}-story.jpg`;
  await mkdir("logs/social", { recursive: true });
  await writeFile(file, await render("story"));
  console.log(`written to ${file}`);
  await db.$client.end();
  process.exit(0);
}

// The day's row is created before publishing, so the choice holds even if every target fails.
await db
  .insert(socialPromos)
  .values({ day: today, promoKey: promo.key })
  .onConflictDoNothing({ target: socialPromos.day });

// Each image is rendered and saved once, and only if a target still needs it.
const saved = new Map<SocialFormat, Promise<string>>();
const imageUrl = (format: SocialFormat) => {
  if (!saved.has(format)) {
    const name = `promo-${today}${format === "story" ? "-story" : ""}`;
    saved.set(
      format,
      render(format).then((jpeg) => saveSocialImage(jpeg, name)),
    );
  }
  return saved.get(format)!;
};

const publishers: Record<(typeof targets)[number], () => Promise<string>> = {
  facebookStoryId: async () => storyToFacebook(await imageUrl("story")),
  instagramStoryId: async () => storyToInstagram(await imageUrl("story")),
};

let failed = false;
for (const column of targets) {
  if (existing?.[column]) continue;
  try {
    const id = await publishers[column]();
    // Saved right away, so a later failure can't make this target publish again.
    await db
      .update(socialPromos)
      .set({ [column]: id })
      .where(eq(socialPromos.day, today));
    console.log(`${column}: published ${id}`);
  } catch (error) {
    failed = true;
    console.error(`${column}: failed, retried next run — ${String(error)}`);
  }
}

await db.$client.end();
if (failed) process.exitCode = 1;

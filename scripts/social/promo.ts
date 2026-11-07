// Daily promotional post and story about a site feature, on the Facebook Page and Instagram.
// Picks the message from promos.ts that was posted longest ago (or never), renders the post and
// story images, publishes them and records the ids in social_promos: one promo per Tunis day,
// nothing published twice, and a failed target is retried by a later run the same day.
// Usage: npm run social:promo [-- --dry-run]   (dry run writes images and captions to logs/social/)
import { mkdir, writeFile } from "node:fs/promises";

import { eq, max } from "drizzle-orm";

import { socialPromos, type SocialPromo } from "../../src/db/schema.ts";
import { db } from "../mcp/config.ts";
import { brandHost, renderSocialImage, type SocialFormat } from "./image.ts";
import {
  postToFacebook,
  postToInstagram,
  storyToFacebook,
  storyToInstagram,
} from "./meta.ts";
import {
  loadPromoStats,
  promos,
  type Promo,
  type PromoContent,
} from "./promos.ts";
import { saveSocialImage } from "./upload.ts";

const dryRun = process.argv.includes("--dry-run");
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Africa/Tunis",
});

const hashtags = (promo: Promo) =>
  [
    "#padel",
    "#padeltunisie",
    "#tunisie",
    "#connect",
    `#${promo.category
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}`,
  ].join(" ");

function captions(promo: Promo, content: PromoContent) {
  const intro = `${content.title}\n\n${content.text}`;
  return {
    facebook: `${intro}\n\n👉 https://${brandHost}${content.path}\n\n${hashtags(promo)}`,
    // Links in Instagram captions aren't clickable.
    instagram: `${intro}\n\n🔗 ${brandHost}${content.path} (lien en bio)\n\n${hashtags(promo)}`,
  };
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
const targets = [
  "facebookPostId",
  "instagramPostId",
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
const text = captions(promo, content);
console.log(`promo ${today}: ${promo.key}${dryRun ? " (dry run)" : ""}`);
const render = (format: SocialFormat) =>
  renderSocialImage({
    title: content.title,
    category: promo.category,
    excerpt: content.text,
    cta: content.cta,
    format,
  });

if (dryRun) {
  const base = `logs/social/promo-${today}-${promo.key}`;
  await mkdir("logs/social", { recursive: true });
  await writeFile(`${base}.jpg`, await render("post"));
  await writeFile(`${base}-story.jpg`, await render("story"));
  await writeFile(
    `${base}.txt`,
    `FACEBOOK\n${text.facebook}\n\nINSTAGRAM\n${text.instagram}\n`,
  );
  console.log(`written to ${base}.jpg, -story.jpg and .txt`);
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
  facebookPostId: async () =>
    postToFacebook(await imageUrl("post"), text.facebook),
  instagramPostId: async () =>
    postToInstagram(await imageUrl("post"), text.instagram),
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

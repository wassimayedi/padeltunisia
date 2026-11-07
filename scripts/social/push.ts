// Posts newly published magazine articles to the Facebook Page and Instagram, with a branded 4:5
// image (image.ts). Each network's post id is saved on the article, so nothing is posted twice and
// a failed network is retried on the next run. Only articles from the last 3 days are considered.
// Usage: npm run social:push [-- --dry-run]   (dry run writes image and captions to logs/social/)
import { mkdir, writeFile } from "node:fs/promises";

import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";

import { magazine, type MagazineArticle } from "../../src/db/schema.ts";
import { db, siteUrl } from "../mcp/config.ts";
import { renderSocialImage } from "./image.ts";
import { postToFacebook, postToInstagram } from "./meta.ts";
import { saveSocialImage } from "./upload.ts";

const dryRun = process.argv.includes("--dry-run");
const lookbackDays = 3;

/** YYYY-MM-DD in Tunis, `daysAgo` days before today. */
function tunisDate(daysAgo = 0) {
  return new Date(Date.now() - daysAgo * 86_400_000).toLocaleDateString(
    "en-CA",
    {
      timeZone: "Africa/Tunis",
    },
  );
}

/** "Padel Tunisie" → "#padeltunisie" (no accents, spaces or punctuation). */
const hashtag = (text: string) =>
  `#${text
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // strip accents left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}`;

function hashtags(article: MagazineArticle) {
  const tags = [
    "padel",
    "padeltunisie",
    article.category,
    ...article.keywords.slice(0, 3),
    "tunisie",
  ]
    .map(hashtag)
    .filter((tag) => tag.length > 2 && tag.length <= 30);
  return [...new Set(tags)].slice(0, 6).join(" ");
}

function captions(article: MagazineArticle) {
  const url = `${siteUrl}/articles/${article.slug}`;
  const intro = `${article.title}\n\n${article.excerpt}`;
  return {
    facebook: `${intro}\n\n👉 Lire l'article : ${url}\n\n${hashtags(article)}`,
    // Links in Instagram captions aren't clickable.
    instagram: `${intro}\n\n🔗 Article complet sur padeltunisia.tn (lien en bio)\n\n${hashtags(article)}`,
  };
}

const articles = await db
  .select()
  .from(magazine)
  .where(
    and(
      lte(magazine.publishedOn, tunisDate()),
      gte(magazine.publishedOn, tunisDate(lookbackDays)),
      or(isNull(magazine.facebookPostId), isNull(magazine.instagramPostId)),
    ),
  )
  .orderBy(desc(magazine.publishedOn));

console.log(
  `${articles.length} article(s) to post${dryRun ? " (dry run)" : ""}`,
);
let failed = false;

for (const article of articles) {
  console.log(`--- ${article.slug}`);
  const text = captions(article);
  const jpeg = await renderSocialImage({
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
  });

  if (dryRun) {
    await mkdir("logs/social", { recursive: true });
    await writeFile(`logs/social/${article.slug}.jpg`, jpeg);
    await writeFile(
      `logs/social/${article.slug}.txt`,
      `FACEBOOK\n${text.facebook}\n\nINSTAGRAM\n${text.instagram}\n`,
    );
    console.log(`written to logs/social/${article.slug}.jpg and .txt`);
    continue;
  }

  const imageUrl = await saveSocialImage(jpeg, article.slug);
  const networks = [
    {
      name: "facebook",
      done: article.facebookPostId,
      column: "facebookPostId",
      post: () => postToFacebook(imageUrl, text.facebook),
    },
    {
      name: "instagram",
      done: article.instagramPostId,
      column: "instagramPostId",
      post: () => postToInstagram(imageUrl, text.instagram),
    },
  ] as const;

  for (const network of networks) {
    if (network.done) continue;
    try {
      const id = await network.post();
      // Saved right away, so a later failure can't make this network post again.
      await db
        .update(magazine)
        .set({ [network.column]: id })
        .where(eq(magazine.id, article.id));
      console.log(`${network.name}: posted ${id}`);
    } catch (error) {
      failed = true;
      console.error(
        `${network.name}: failed, retried next run — ${String(error)}`,
      );
    }
  }
}

await db.$client.end();
if (failed) process.exitCode = 1;

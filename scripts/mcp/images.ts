// Image storage for the tools: everything is converted to WebP and saved under uploadsDir with a
// content hash in the name, so the site can cache it forever.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { uploadsDir } from "./config.ts";

export type ImageFolder = "events" | "news" | "magazine";

// Sized for where each image is shown: news photos only fill small cards (about 2x their width),
// event posters are read on the event page, covers are 1200×630 social images.
const presets: Record<ImageFolder, { maxSize: number; quality: number }> = {
  news: { maxSize: 800, quality: 70 },
  events: { maxSize: 1200, quality: 78 },
  magazine: { maxSize: 1200, quality: 80 },
};

/** Encodes an image to WebP for its folder (metadata stripped); returns the bytes and its future path. */
export async function toWebp(input: Buffer, folder: ImageFolder, name: string) {
  const { maxSize, quality } = presets[folder];
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  const file = `${name}-${createHash("sha256").update(data).digest("hex").slice(0, 8)}.webp`;
  return {
    data,
    width: info.width,
    height: info.height,
    url: `/uploads/${folder}/${file}`,
    folder,
    file,
  };
}

export async function saveImage(image: Awaited<ReturnType<typeof toWebp>>) {
  await mkdir(join(uploadsDir, image.folder), { recursive: true });
  await writeFile(join(uploadsDir, image.folder, image.file), image.data);
  return image.url;
}

// Pages the agent reads may point anywhere; never fetch from the server's own network.
const privateHost =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;
const maxBytes = 15 * 1024 * 1024;

async function get(url: URL) {
  if (!/^https?:$/.test(url.protocol) || privateHost.test(url.hostname)) {
    throw new Error(`Refusing to fetch ${url.href}`);
  }
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; PadelTunisiaBot/1.0; +https://padeltunisia.tn)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url.href} answered ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes)
    throw new Error(`${url.href} is too large`);
  return response;
}

/** The page's share image (og:image, then twitter:image). */
function shareImage(html: string, page: URL) {
  for (const key of ["og:image:secure_url", "og:image", "twitter:image"]) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const name = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (name?.toLowerCase() === key && content)
        return new URL(content.replaceAll("&amp;", "&"), page);
    }
  }
  return null;
}

/** Downloads an image, or the share image of a web page. */
export async function download(source: string) {
  let url = new URL(source);
  let response = await get(url);
  if (response.headers.get("content-type")?.includes("text/html")) {
    const image = shareImage(await response.text(), url);
    if (!image) throw new Error(`No og:image or twitter:image on ${url.href}`);
    url = image;
    response = await get(url);
  }
  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error(`${url.href} is not an image (${response.headers.get("content-type")})`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > maxBytes) throw new Error(`${url.href} is too large`);
  return { data, url: url.href };
}

// 1080×1350 (4:5) JPEG for Instagram and Facebook posts of a magazine article: the cover photo
// under a navy gradient, with the category, title, a line of the excerpt and the logo on top.
// Drawn with satori like scripts/mcp/cover.ts (text as SVG paths, so no system fonts are needed).
import { readFile } from "node:fs/promises";

import satori from "satori";
import sharp from "sharp";

import { siteUrl } from "../mcp/config.ts";

const width = 1080;
const height = 1350;

const navy = "#0f2352";
const lime = "#c6ed47";
const court = "#3772bb";
const light = "#f4f9ff";

const asset = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url));
const font = (weight: 600 | 800) =>
  asset(
    `node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-${weight}-normal.woff`,
  );

// Plain objects in the shape of React elements, which is what satori takes (no JSX in scripts).
type Node = { type: string; key: null; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  ...children: (Node | string)[]
): Node => ({ type, key: null, props: { style, children } });
const img = (
  src: string,
  w: number,
  h: number,
  style: Record<string, unknown> = {},
): Node => ({
  type: "img",
  key: null,
  props: { src, width: w, height: h, style },
});

const dataUri = (mime: string, data: Buffer) =>
  `data:${mime};base64,${data.toString("base64")}`;

/** Cover photo cropped to 4:5 as JPEG (satori doesn't read WebP), or null when it can't be loaded. */
async function background(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(new URL(imageUrl, siteUrl));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const photo = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return dataUri("image/jpeg", photo);
  } catch (error) {
    console.warn(
      `social image: cover ${imageUrl} not loaded (${String(error)}), using the plain background`,
    );
    return null;
  }
}

/** Cuts text at a word boundary so it fits in about `max` characters. */
const clip = (text: string, max: number) =>
  text.length <= max
    ? text
    : `${text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[,;:.\s]+$/, "")}…`;

// Court seen from above in thin lines, shown when the article has no photo.
const courtLines = el(
  "div",
  {
    position: "absolute",
    top: 90,
    left: 320,
    width: 440,
    height: 560,
    display: "flex",
    border: `3px solid ${court}`,
    borderRadius: 8,
    opacity: 0.5,
  },
  el("div", {
    position: "absolute",
    left: 0,
    top: 277,
    width: 434,
    height: 0,
    borderTop: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 0,
    top: 92,
    width: 434,
    height: 0,
    borderTop: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 0,
    top: 462,
    width: 434,
    height: 0,
    borderTop: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 217,
    top: 92,
    width: 0,
    height: 370,
    borderLeft: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 160,
    top: 230,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: lime,
    opacity: 0.9,
  }),
);

export async function renderSocialImage({
  title,
  category,
  excerpt,
  imageUrl,
}: {
  title: string;
  category: string;
  excerpt: string;
  imageUrl?: string | null;
}) {
  const [photo, logo, semibold, extrabold] = await Promise.all([
    background(imageUrl),
    asset("public/logo.webp").then((data) => sharp(data).png().toBuffer()),
    font(600),
    font(800),
  ]);
  const titleSize = title.length <= 45 ? 84 : title.length <= 70 ? 72 : 60;

  const svg = await satori(
    el(
      "div",
      {
        width,
        height,
        display: "flex",
        position: "relative",
        backgroundColor: navy,
        fontFamily: "Bricolage Grotesque",
        color: light,
      },
      photo
        ? img(photo, width, height, { position: "absolute", top: 0, left: 0 })
        : courtLines,
      // Darkens the lower half so the text stays readable on any photo.
      el("div", {
        position: "absolute",
        inset: 0,
        backgroundImage: photo
          ? `linear-gradient(180deg, rgba(15,35,82,0.15) 0%, rgba(15,35,82,0.55) 40%, ${navy} 78%)`
          : "none",
      }),
      el(
        "div",
        {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "80px 72px",
        },
        el(
          "div",
          { display: "flex", marginBottom: 28 },
          el(
            "div",
            {
              backgroundColor: lime,
              color: navy,
              fontSize: 30,
              fontWeight: 800,
              padding: "10px 26px",
              borderRadius: 999,
            },
            category,
          ),
        ),
        el(
          "div",
          {
            display: "flex",
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
          },
          clip(title, 110),
        ),
        el(
          "div",
          {
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            fontWeight: 600,
            lineHeight: 1.3,
            opacity: 0.88,
          },
          clip(excerpt, 140),
        ),
        el(
          "div",
          {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 56,
            paddingTop: 32,
            borderTop: `2px solid rgba(244,249,255,0.25)`,
            fontSize: 34,
            fontWeight: 800,
          },
          el(
            "div",
            { display: "flex", alignItems: "center" },
            img(dataUri("image/png", logo), 56, 56, { marginRight: 16 }),
            "Padel",
            el("span", { color: lime }, "Tunisia"),
          ),
          el(
            "div",
            { display: "flex", fontSize: 30, fontWeight: 600, color: lime },
            new URL(siteUrl).host,
          ),
        ),
      ),
    ),
    {
      width,
      height,
      fonts: [
        {
          name: "Bricolage Grotesque",
          data: semibold,
          weight: 600,
          style: "normal",
        },
        {
          name: "Bricolage Grotesque",
          data: extrabold,
          weight: 800,
          style: "normal",
        },
      ],
    },
  );
  return sharp(Buffer.from(svg))
    .flatten({ background: navy })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

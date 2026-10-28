// Branded 1200×630 cover for magazine articles: title and category on the site's navy, with court
// lines and the logo. Drawn with satori (text as SVG paths, so no system fonts are needed).
import { readFile } from "node:fs/promises";

import satori from "satori";
import sharp from "sharp";

const navy = "#0f2352";
const lime = "#c6ed47";
const court = "#3772bb";
const light = "#f4f9ff";

const asset = (path: string) => readFile(new URL(`../../${path}`, import.meta.url));
const font = (weight: 700 | 800) =>
  asset(
    `node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-${weight}-normal.woff`,
  );

// Plain objects in the shape of React elements, which is what satori takes (no JSX in scripts).
type Node = { type: string; key: null; props: Record<string, unknown> };
const el = (
  type: string,
  style: Record<string, unknown>,
  ...children: (Node | string)[]
): Node => ({
  type,
  key: null,
  props: { style, children },
});

// Court seen from above, drawn in thin lines on the right half.
const courtLines = el(
  "div",
  {
    position: "absolute",
    top: 70,
    left: 880,
    width: 640,
    height: 490,
    display: "flex",
    border: `3px solid ${court}`,
    borderRadius: 8,
    opacity: 0.55,
  },
  el("div", {
    position: "absolute",
    left: 318,
    top: 0,
    width: 0,
    height: 484,
    borderLeft: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 110,
    top: 242,
    width: 414,
    height: 0,
    borderTop: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 110,
    top: 0,
    width: 0,
    height: 484,
    borderLeft: `3px solid ${court}`,
  }),
  el("div", {
    position: "absolute",
    left: 524,
    top: 0,
    width: 0,
    height: 484,
    borderLeft: `3px solid ${court}`,
  }),
);

export async function renderCover({ title, category }: { title: string; category: string }) {
  const logo = await sharp(await asset("public/logo.webp"))
    .png()
    .toBuffer();
  const titleSize = title.length <= 50 ? 68 : title.length <= 80 ? 58 : 48;

  const svg = await satori(
    el(
      "div",
      {
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        backgroundColor: navy,
        fontFamily: "Bricolage Grotesque",
        color: light,
      },
      courtLines,
      el("div", {
        position: "absolute",
        left: 1010,
        top: 400,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: lime,
      }),
      el(
        "div",
        {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
        },
        el(
          "div",
          { display: "flex" },
          el(
            "div",
            {
              backgroundColor: lime,
              color: navy,
              fontSize: 26,
              fontWeight: 700,
              padding: "8px 22px",
              borderRadius: 999,
            },
            category,
          ),
        ),
        el(
          "div",
          {
            display: "flex",
            width: 780,
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -1,
          },
          title,
        ),
        el(
          "div",
          { display: "flex", alignItems: "center", fontSize: 32, fontWeight: 800 },
          {
            type: "img",
            key: null,
            props: {
              src: `data:image/png;base64,${logo.toString("base64")}`,
              width: 48,
              height: 48,
              style: { marginRight: 14 },
            },
          },
          "Padel",
          el("span", { color: lime }, "Tunisia"),
        ),
      ),
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Bricolage Grotesque", data: await font(700), weight: 700, style: "normal" },
        { name: "Bricolage Grotesque", data: await font(800), weight: 800, style: "normal" },
      ],
    },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

import { z } from "zod";

import { download, saveImage, toWebp } from "../images.ts";
import { defineTool, reply, slug } from "../tool.ts";

export const imageTools = [
  defineTool({
    name: "save_image",
    description:
      "Download an image and store it on the site, returning the URL to pass as an event's posterUrl or a news item's imageUrl. Give the image URL, or a web page URL to take its share image (og:image).",
    inputSchema: {
      url: z.string().url().describe("Image URL, or the page whose og:image to take"),
      folder: z.enum(["events", "news"]),
      name: slug.describe("File name: the event slug, or a short slug of the news title"),
    },
    handler: async ({ url, folder, name }) => {
      const source = await download(url);
      const image = await toWebp(source.data, folder, name);
      return reply({
        url: await saveImage(image),
        width: image.width,
        height: image.height,
        source: source.url,
      });
    },
  }),
];

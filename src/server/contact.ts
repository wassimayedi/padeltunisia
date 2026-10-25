// Stores contact form messages. Server-only: never import from client code.
import { createHash } from "node:crypto";

import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { and, count, eq, gte } from "drizzle-orm";

import { contactMessages } from "@/db/schema";
import type { ContactInput } from "@/lib/contact";
import { db } from "@/server/db";

const MAX_PER_HOUR = 5;
const MIN_FILL_MS = 3_000;

export class ContactRateLimitError extends Error {}

function ipHash() {
  // Behind Cloudflare the client IP is in cf-connecting-ip; locally fall back to the socket.
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true });
  if (!ip) return null;
  // Salted with the DB URL so the hashes can't be matched against a list of IPs.
  return createHash("sha256").update(`${ip}:${process.env["DATABASE_URL"] ?? ""}`).digest("hex");
}

/** Returns false for submissions dropped as spam (the sender still sees a success message). */
export async function saveContactMessage(input: ContactInput) {
  const isBot = Boolean(input.website) || Date.now() - input.openedAt < MIN_FILL_MS;
  if (isBot) return false;

  const hash = ipHash();
  if (hash) {
    const [recent] = await db()
      .select({ n: count() })
      .from(contactMessages)
      .where(and(eq(contactMessages.ipHash, hash), gte(contactMessages.createdAt, new Date(Date.now() - 3_600_000))));
    if ((recent?.n ?? 0) >= MAX_PER_HOUR) throw new ContactRateLimitError("Trop de messages envoyés. Réessayez dans une heure.");
  }

  await db().insert(contactMessages).values({
    topic: input.topic,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    organization: input.organization || null,
    message: input.message,
    ipHash: hash,
  });
  return true;
}

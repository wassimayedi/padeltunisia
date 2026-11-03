// Sends the WhatsApp and email messages queued in `notifications`. Server-only.
// Email goes through Gmail SMTP when GMAIL_APP_PASSWORD is set, otherwise Resend; WhatsApp through
// our whatsapp-api-server (POST {WHATSAPP_SERVER}/send-message).
import { and, eq, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";

import { clubs, matches, notifications, players } from "@/db/schema";
import { formatMatchDay, formatTime, whatsappLink } from "@/lib/matches";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { db } from "@/server/db";

export type NotificationType = "join_request" | "request_accepted" | "request_rejected" | "request_cancelled" | "player_left" | "match_cancelled" | "match_full";

type MatchInfo = { id: string; startsAt: Date; clubName: string; city: string };

/** Subject and text of each message; the link leads to the match page. */
export function messageFor(type: NotificationType, m: MatchInfo) {
  const when = `${formatMatchDay(m.startsAt)} à ${formatTime(m.startsAt)}`;
  const where = `${m.clubName} (${m.city})`;
  const link = absoluteUrl(`/matchs/${m.id}`);
  const lines: Record<NotificationType, [string, string]> = {
    join_request: ["Nouvelle demande pour votre match", `Un joueur veut rejoindre votre match du ${when} à ${where}. Acceptez ou refusez sa demande :`],
    request_accepted: ["Vous êtes dans le match !", `Votre demande pour le match du ${when} à ${where} est acceptée. Retrouvez les contacts des joueurs :`],
    request_rejected: ["Demande non retenue", `Votre demande pour le match du ${when} à ${where} n'a pas été retenue. D'autres matchs vous attendent :`],
    request_cancelled: ["Demande retirée", `Un joueur a retiré sa demande pour votre match du ${when} à ${where}.`],
    player_left: ["Un joueur a quitté votre match", `Un joueur a quitté votre match du ${when} à ${where} : une place est de nouveau libre.`],
    match_cancelled: ["Match annulé", `Le match du ${when} à ${where} a été annulé par son créateur.`],
    match_full: ["Match complet", `Le match du ${when} à ${where} est complet. D'autres matchs vous attendent :`],
  };
  const [subject, body] = lines[type];
  return { subject: `${subject} · ${SITE_NAME}`, text: `${body}\n${link}`, link };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendEmail(to: string, subject: string, text: string, link: string) {
  const html = `<p style="font-family:sans-serif;font-size:15px">${escapeHtml(text.replace(link, "")).replace(/\n/g, "<br>")}</p><p><a href="${link}" style="font-family:sans-serif;font-weight:bold;color:#13295c">Voir le match</a></p>`;
  const from = process.env["EMAIL_FROM"]?.trim() || `${SITE_NAME} <noreply@padeltunisia.tn>`;
  const gmailPass = process.env["GMAIL_APP_PASSWORD"]?.trim();
  const gmailUser = process.env["GMAIL_USER"]?.trim();
  if (gmailUser && gmailPass) {
    const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gmailUser, pass: gmailPass } });
    await transport.sendMail({ from, to, subject, text, html, headers: { "X-Auto-Response-Suppress": "All" } });
    return;
  }
  const key = process.env["RESEND_API_KEY"]?.trim();
  if (!key) throw new Error("No email provider (GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendWhatsapp(countryCode: string, phone: string, text: string) {
  const server = process.env["WHATSAPP_SERVER"]?.trim();
  const key = process.env["WHATSAPP_API_KEY"]?.trim();
  if (!server || !key) throw new Error("WHATSAPP_SERVER or WHATSAPP_API_KEY is not set");
  // The server wants international digits, e.g. 21622123456.
  const to = whatsappLink(countryCode, phone).replace("https://wa.me/", "");
  const res = await fetch(`${server.replace(/\/+$/, "")}/send-message`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ to, message: text }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/** Sends the given notifications and records the outcome; never throws. */
export async function deliver(ids: number[]) {
  if (ids.length === 0) return;
  try {
    const rows = await db()
      .select({
        id: notifications.id,
        type: notifications.type,
        channel: notifications.channel,
        email: players.email,
        phone: players.phone,
        phoneCountryCode: players.phoneCountryCode,
        match: { id: matches.id, startsAt: matches.startsAt, clubName: clubs.name, city: clubs.city },
      })
      .from(notifications)
      .innerJoin(players, eq(players.id, notifications.playerId))
      .innerJoin(matches, eq(matches.id, notifications.matchId))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(and(inArray(notifications.id, ids), eq(notifications.status, "pending")));
    await Promise.all(
      rows.map(async (n) => {
        const { subject, text, link } = messageFor(n.type as NotificationType, n.match);
        try {
          if (n.channel === "email" && n.email) await sendEmail(n.email, subject, text, link);
          else if (n.channel === "whatsapp" && n.phone) await sendWhatsapp(n.phoneCountryCode, n.phone, `${subject}\n\n${text}`);
          else throw new Error("No address for this channel");
          await db().update(notifications).set({ status: "sent", sentAt: new Date(), error: null }).where(eq(notifications.id, n.id));
        } catch (error) {
          console.warn(`[notify] ${n.channel} #${n.id} failed`, error);
          await db()
            .update(notifications)
            .set({ status: "failed", error: String(error instanceof Error ? error.message : error).slice(0, 500) })
            .where(eq(notifications.id, n.id));
        }
      }),
    );
  } catch (error) {
    console.error("[notify] delivery failed", error);
  }
}

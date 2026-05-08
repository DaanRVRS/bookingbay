"use server";

import { z } from "zod";
import { sendEmail, emailLayout } from "@/lib/email";
import { env } from "@/lib/env";

const SUPPORT_INBOX = "hallo@bookingbay.nl";

const schema = z.object({
  name: z.string().min(2, "Naam is te kort").max(120),
  email: z.string().email("Ongeldig e-mailadres").max(200),
  phone: z.string().max(40).default(""),
  topic: z.enum(["demo", "vraag", "anders"]),
  message: z.string().min(2, "Bericht is te kort").max(4000),
  // Honeypot — should always be empty
  website: z.string().max(0).optional().default(""),
});

export type MarketingContactInput = z.infer<typeof schema>;

const TOPIC_LABELS: Record<MarketingContactInput["topic"], string> = {
  demo: "Demo aanvraag",
  vraag: "Algemene vraag",
  anders: "Overig",
};

export async function sendMarketingContactAction(
  input: MarketingContactInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  // Honeypot tripped — silently succeed so the bot thinks it worked.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return { ok: true };
  }

  const { name, email, phone, topic, message } = parsed.data;
  const subject = `[BookingBay site] ${TOPIC_LABELS[topic]} — ${name}`;

  // 1. Notify support inbox
  const internalHtml = emailLayout(`
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600">Nieuwe contact-aanvraag</h1>
    <table style="border-collapse:collapse;font-size:14px;margin:0 0 16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Onderwerp</td><td style="padding:4px 0">${TOPIC_LABELS[topic]}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Naam</td><td style="padding:4px 0"><strong>${escapeHtml(name)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">E-mail</td><td style="padding:4px 0"><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></td></tr>
      ${phone ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Telefoon</td><td style="padding:4px 0">${escapeHtml(phone)}</td></tr>` : ""}
    </table>
    <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;font-size:14px;white-space:pre-line">${escapeHtml(message)}</div>
    <p style="font-size:12px;color:#6b7280;margin-top:16px">
      Verstuurd via ${env.APP_URL}/contact
    </p>
  `);
  const internalResult = await sendEmail({
    to: SUPPORT_INBOX,
    subject,
    html: internalHtml,
    text: `Onderwerp: ${TOPIC_LABELS[topic]}\nVan: ${name} <${email}>${phone ? `\nTelefoon: ${phone}` : ""}\n\n${message}`,
  });
  if (!internalResult.ok) {
    return {
      ok: false,
      error:
        "We konden je bericht niet verzenden. Probeer het opnieuw of mail ons rechtstreeks.",
    };
  }

  // 2. Send confirmation to the sender (best-effort, don't fail if this errors)
  await sendEmail({
    to: email,
    subject: "We hebben je bericht ontvangen — BookingBay",
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600">Bedankt voor je bericht!</h1>
      <p>Hoi ${escapeHtml(name)},</p>
      <p>
        We hebben je bericht goed ontvangen en reageren meestal binnen één
        werkdag. Heel veel dank voor je interesse in BookingBay.
      </p>
      <p>
        Voor de zekerheid hieronder een kopie van wat je instuurde:
      </p>
      <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;font-size:14px;white-space:pre-line;color:#374151">${escapeHtml(message)}</div>
      <p>Tot snel!<br>— Het BookingBay team</p>
    `),
    text: `Hoi ${name},\n\nWe hebben je bericht ontvangen en reageren binnen één werkdag.\n\nKopie van je bericht:\n${message}\n\n— BookingBay`,
  });

  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { COMPANY } from "@/lib/company";
import {
  verifyUnsubscribeToken,
  type UnsubscribeKind,
} from "@/lib/mail-unsubscribe";

export const dynamic = "force-dynamic";

/**
 * Afmelden voor niet-transactionele mail. GET vanuit de afmeldlink in de
 * mail (toont een korte bevestigingspagina), POST voor de one-click-knop
 * van mailclients (List-Unsubscribe-Post, RFC 8058).
 *
 *   kind=broadcast → User.broadcastEmailOptOutAt (geen broadcast-e-mails meer;
 *                    servicemededelingen blijven in de dashboard-notificaties)
 *   kind=marketing → User.marketingOptIn = false
 *   kind=review    → Customer.reviewRequestOptOutAt (geen review-uitvraag meer)
 */

const KINDS: UnsubscribeKind[] = ["broadcast", "marketing", "review"];

async function applyUnsubscribe(url: URL): Promise<{ ok: boolean; message: string }> {
  const kind = url.searchParams.get("kind") ?? "";
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!KINDS.includes(kind as UnsubscribeKind) || !id || !token) {
    return { ok: false, message: "Deze afmeldlink is niet geldig." };
  }
  if (!verifyUnsubscribeToken(kind as UnsubscribeKind, id, token)) {
    return { ok: false, message: "Deze afmeldlink is niet geldig." };
  }

  const now = new Date();
  if (kind === "review") {
    const res = await db.customer.updateMany({
      where: { id, reviewRequestOptOutAt: null },
      data: { reviewRequestOptOutAt: now },
    });
    await audit({
      action: "customer.review-request.unsubscribed",
      resource: "customer",
      resourceId: id,
      metadata: { changed: res.count },
    });
    return {
      ok: true,
      message:
        "Je ontvangt geen verzoeken meer om een review te schrijven. Bevestigingen en herinneringen van je boekingen blijf je wel ontvangen.",
    };
  }
  if (kind === "marketing") {
    await db.user.updateMany({ where: { id }, data: { marketingOptIn: false } });
    await audit({
      actorUserId: id,
      action: "user.marketing.unsubscribed",
      resource: "user",
      resourceId: id,
    });
    return {
      ok: true,
      message:
        "Je ontvangt geen productnieuws of aanbiedingen meer per e-mail. Je kunt dit altijd weer aanzetten in je profiel.",
    };
  }
  await db.user.updateMany({
    where: { id, broadcastEmailOptOutAt: null },
    data: { broadcastEmailOptOutAt: now },
  });
  await audit({
    actorUserId: id,
    action: "user.broadcast.unsubscribed",
    resource: "user",
    resourceId: id,
  });
  return {
    ok: true,
    message:
      "Je ontvangt geen algemene BookingBay-berichten meer per e-mail. Belangrijke mededelingen over je account en abonnement (verlenging, betaling, wijziging van voorwaarden) blijf je ontvangen; andere berichten vind je in je dashboard onder Notificaties.",
  };
}

function page(title: string, message: string, ok: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${title} · ${COMPANY.brand}</title>
</head>
<body style="margin:0;padding:40px 20px;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2238">
  <main style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e6ed;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 12px;font-size:22px">${title}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${message}</p>
    <p style="margin:0;font-size:13px;color:#6b7280">
      ${COMPANY.brand} is een dienst van ${COMPANY.legalName}. Vragen? Mail
      <a href="mailto:${COMPANY.email}" style="color:#1a2238">${COMPANY.email}</a>.
    </p>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  const result = await applyUnsubscribe(new URL(req.url));
  return page(result.ok ? "Afgemeld" : "Link niet geldig", result.message, result.ok);
}

export async function POST(req: Request) {
  const result = await applyUnsubscribe(new URL(req.url));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

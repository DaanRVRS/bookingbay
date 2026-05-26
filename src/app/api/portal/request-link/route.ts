import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail, emailLayout } from "@/lib/email";
import { createPortalToken } from "@/lib/portal/session";
import { audit } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stuurt een magic-link mail naar customer.email om in te loggen op
 * /portal/[slug]. We bevestigen altijd succesvol (ook bij onbekend
 * e-mail) — anders kunnen scrapers achterhalen welke klanten een org
 * heeft.
 */
export async function POST(req: Request) {
  let body: { slug?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige aanvraag" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!slug || !email) {
    return NextResponse.json({ ok: false, error: "Slug + e-mail vereist" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      customerPortalEnabled: true,
      suspendedAt: true,
    },
  });
  if (!org || !org.customerPortalEnabled || org.suspendedAt) {
    // Vague respons om enumeratie te voorkomen — als de tenant het
    // portaal uit heeft, of niet bestaat, krijgen we ditzelfde antwoord.
    return NextResponse.json({ ok: true });
  }

  // Stuur alleen mail als deze e-mail óók customer is van deze org.
  const customer = await db.customer.findFirst({
    where: { organizationId: org.id, email },
    select: { id: true, name: true },
  });

  if (customer) {
    const { token } = await createPortalToken(org.id, email);
    const baseUrl = env.APP_URL.replace(/\/$/, "");
    const url = `${baseUrl}/portal/${org.slug}/auth?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: `Log in bij ${org.name}`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Log in bij ${org.name}</h1>
        <p style="margin:0 0 12px 0">
          Klik op de knop hieronder om je boekingen te zien. De link is 15
          minuten geldig en kan één keer gebruikt worden.
        </p>
        <p style="margin:24px 0">
          <a href="${url}" style="display:inline-block;background:#ef5934;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
            Open mijn portaal
          </a>
        </p>
        <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280">
          Heb jij deze mail niet aangevraagd? Negeer 'm dan — er gebeurt niks
          met je account.
        </p>
      `),
      text: `Open je portaal: ${url}`,
    });
    await audit({
      organizationId: org.id,
      action: "portal.login.requested",
      resource: "customer",
      resourceId: customer.id,
      metadata: { email },
    });
  }

  return NextResponse.json({ ok: true });
}

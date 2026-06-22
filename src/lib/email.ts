import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "@/lib/env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

type Provider = "smtp" | "resend" | "console";

function pickProvider(): Provider {
  if (env.SMTP_HOST && env.SMTP_USER) return "smtp";
  if (env.RESEND_API_KEY) return "resend";
  return "console";
}

let cachedTransporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const secure =
    env.SMTP_SECURE === "true" || env.SMTP_SECURE === "1" || env.SMTP_PORT === 465;
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return cachedTransporter;
}

let cachedResend: Resend | null = null;
function getResend(): Resend {
  if (!cachedResend) cachedResend = new Resend(env.RESEND_API_KEY);
  return cachedResend;
}

function logToConsole(options: SendEmailOptions, from: string) {
  console.log(
    [
      "",
      "─────────────── EMAIL (console fallback) ───────────────",
      `From:    ${from}`,
      `To:      ${options.to}`,
      `Subject: ${options.subject}`,
      "─────────────────────────────────────────────────────────",
      options.text ?? options.html.replace(/<[^>]+>/g, ""),
      "─────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

export interface SendEmailResult {
  ok: boolean;
  provider: Provider;
  error?: string;
}

/**
 * Sends an email and NEVER throws.
 * Returns {ok: false, error} on failure so the caller can decide whether
 * to surface the issue. This keeps registration / reset flows alive even
 * when the SMTP server is misconfigured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = options.from ?? env.EMAIL_FROM;
  const provider = pickProvider();

  if (provider === "console") {
    logToConsole(options, from);
    return { ok: true, provider };
  }

  try {
    if (provider === "smtp") {
      await getTransporter().sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return { ok: true, provider };
    }

    // Resend
    const result = await getResend().emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (result.error) {
      console.error(`[email] Resend rejected: ${result.error.message}`);
      return { ok: false, provider, error: result.error.message };
    }
    return { ok: true, provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed via ${provider}: ${message}`);
    return { ok: false, provider, error: message };
  }
}

export function emailLayout(content: string): string {
  // Logo is gehost als publiek bestand zodat e-mailclients het kunnen
  // ophalen. Geen inline base64 — e-mails blijven klein.
  const logoUrl = `${env.APP_URL}/logo.png`;
  return `
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2238">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #e3e6ed;overflow:hidden">
          <tr>
            <td style="padding:32px 40px 24px 40px">
              <img src="${logoUrl}" alt="BookingBay" height="36" style="display:block;height:36px;width:auto" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px;font-size:15px;line-height:1.6;color:#1a2238">
              ${content}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280">
          Je krijgt deze e-mail omdat iemand dit adres bij BookingBay heeft gebruikt. Niet jij?
          Negeer deze mail dan gerust.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#ef5934;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">${label}</a>`;
}

/**
 * Escapet tekst voor veilige interpolatie in HTML-mails — voorkomt dat
 * klant- of tenant-invoer (naam, itemnaam, ...) de opmaak breekt of links
 * injecteert in uitgaande e-mails.
 */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ??
      c,
  );
}

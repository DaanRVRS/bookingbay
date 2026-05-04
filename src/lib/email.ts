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

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from = options.from ?? env.EMAIL_FROM;
  const provider = pickProvider();

  if (provider === "console") {
    logToConsole(options, from);
    return;
  }

  if (provider === "smtp") {
    try {
      await getTransporter().sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return;
    } catch (err) {
      console.error("SMTP send failed:", err);
      throw new Error(
        `Email send failed via SMTP: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
    console.error("Resend email failed:", result.error);
    throw new Error(`Email send failed: ${result.error.message}`);
  }
}

export function emailLayout(content: string): string {
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
              <div style="display:inline-flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#ef5934,#dc3a3a);border-radius:10px;display:inline-block;text-align:center;line-height:36px;color:#fff;font-weight:600">B</div>
                <span style="font-size:17px;font-weight:600;color:#1a2238">Booking<span style="color:#ef5934">Bay</span></span>
              </div>
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

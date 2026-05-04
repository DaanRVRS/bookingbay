import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from = options.from ?? env.RESEND_FROM;

  if (!resend) {
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
    return;
  }

  const result = await resend.emails.send({
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

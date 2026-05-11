"use server";

import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/session";
import { DISCORD_COLORS, type DiscordChannel } from "./webhook";

export interface DiscordTestResult {
  channel: DiscordChannel;
  configured: boolean;
  source: "channel-specific" | "fallback" | "none";
  ok: boolean;
  status?: number;
  error?: string;
  /** First 40 chars of the URL so we can confirm in the UI without leaking. */
  urlPreview?: string;
}

function pickUrl(channel: DiscordChannel): {
  url: string;
  source: DiscordTestResult["source"];
} {
  const specific =
    channel === "support"
      ? env.DISCORD_WEBHOOK_URL_SUPPORT
      : env.DISCORD_WEBHOOK_URL_CRM;
  if (specific) return { url: specific, source: "channel-specific" };
  if (env.DISCORD_WEBHOOK_URL)
    return { url: env.DISCORD_WEBHOOK_URL, source: "fallback" };
  return { url: "", source: "none" };
}

async function pingChannel(channel: DiscordChannel): Promise<DiscordTestResult> {
  const { url, source } = pickUrl(channel);
  if (!url) {
    return {
      channel,
      configured: false,
      source: "none",
      ok: false,
      error: "Geen webhook URL geconfigureerd voor dit channel",
    };
  }

  const urlPreview = url.slice(0, 40) + "…";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: `BookingBay · ${channel === "support" ? "Support" : "CRM"}`,
        embeds: [
          {
            title: `🧪 Test-bericht (${channel})`,
            description: `Dit is een test vanuit de BookingBay admin. Als je dit ziet, werkt de \`${channel}\`-webhook.`,
            color:
              channel === "support"
                ? DISCORD_COLORS.bookingbay
                : DISCORD_COLORS.info,
            timestamp: new Date().toISOString(),
            footer: { text: `Source: ${source}` },
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        channel,
        configured: true,
        source,
        ok: false,
        status: res.status,
        error: body || res.statusText,
        urlPreview,
      };
    }
    return { channel, configured: true, source, ok: true, status: res.status, urlPreview };
  } catch (err) {
    return {
      channel,
      configured: true,
      source,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      urlPreview,
    };
  }
}

export async function testDiscordWebhooksAction(): Promise<{
  support: DiscordTestResult;
  crm: DiscordTestResult;
}> {
  await requireAdmin();
  const [support, crm] = await Promise.all([
    pingChannel("support"),
    pingChannel("crm"),
  ]);
  return { support, crm };
}

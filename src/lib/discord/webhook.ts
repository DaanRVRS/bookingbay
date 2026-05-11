import "server-only";
import { env } from "@/lib/env";

/**
 * Discord embed payload (minimal subset). See
 * https://discord.com/developers/docs/resources/channel#embed-object
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface DiscordPayload {
  content?: string;
  username?: string;
  embeds?: DiscordEmbed[];
}

export type DiscordChannel = "support" | "crm";

/** Brand-aligned colors (decimal RGB, what Discord expects). */
export const DISCORD_COLORS = {
  bookingbay: 0xef5934,
  info: 0x3b82f6,
  success: 0x16a34a,
  warning: 0xeab308,
  danger: 0xdc2626,
  neutral: 0x6b7280,
} as const;

function resolveWebhookUrl(channel: DiscordChannel): string {
  if (channel === "support") {
    return env.DISCORD_WEBHOOK_URL_SUPPORT || env.DISCORD_WEBHOOK_URL;
  }
  return env.DISCORD_WEBHOOK_URL_CRM || env.DISCORD_WEBHOOK_URL;
}

/**
 * Posts to the configured Discord webhook for `channel`. Fire-and-forget —
 * failures are logged but never thrown so callers don't need to handle them.
 * Returns `false` when no webhook is configured for that channel. Falls
 * back to the generic `DISCORD_WEBHOOK_URL` if the channel-specific one is
 * empty, so single-channel setups keep working.
 */
export async function notifyDiscord(
  payload: DiscordPayload,
  channel: DiscordChannel,
): Promise<boolean> {
  const url = resolveWebhookUrl(channel);
  if (!url) {
    if (env.NODE_ENV !== "production") {
      console.log(
        `─────────────── DISCORD [${channel}] (no webhook configured) ───────────────`,
      );
      console.log(JSON.stringify(payload, null, 2));
      console.log("───────────────────────────────────────────────────────────────");
    }
    return false;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: payload.username ?? "BookingBay",
        ...payload,
      }),
    });
    if (!res.ok) {
      console.error(
        `[discord:${channel}] webhook returned ${res.status}: ${await res.text().catch(() => "")}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[discord:${channel}] webhook post failed:`, err);
    return false;
  }
}

/** Truncate to keep within Discord's 1024-char field-value limit. */
export function truncate(s: string, max = 1024): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

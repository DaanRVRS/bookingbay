import "server-only";
import { env } from "@/lib/env";
import { notifyDiscord, DISCORD_COLORS } from "./webhook";

/**
 * High-level Discord helpers — one per surface so callers don't need to
 * remember the right shape/color. All are best-effort: they never throw.
 *
 * PRIVACY: Discord Inc. (VS) is géén subverwerker. Deze berichten bevatten
 * daarom bewust GEEN persoonsgegevens van klanten, eindklanten, prospects
 * of ticketauteurs — geen namen, e-mailadressen, telefoonnummers of
 * berichtinhoud. Alleen organisatie-/bedrijfsnaam, id's, categorieën,
 * aantallen en een link naar de admin-pagina waar de details staan. De
 * privacyverklaring en de DPA beloven precies dat; houd het zo.
 *
 * Routing:
 *  - tickets + replies     → "support" channel
 *  - leads, signups,
 *    payment-issues,
 *    prospect-events       → "crm" channel
 *
 * Beide kanalen vallen terug op DISCORD_WEBHOOK_URL als de
 * channel-specifieke variant niet gezet is — handig voor setups die alles
 * in één Discord-channel willen.
 */

/* ------------------------- SUPPORT CHANNEL ------------------------- */

interface NewTicketArgs {
  ticketId: string;
  category: string;
  priority: string;
  orgName: string;
}

export function notifyNewSupportTicket(args: NewTicketArgs) {
  return notifyDiscord(
    {
      username: "BookingBay · Support",
      embeds: [
        {
          title: `🎫 Nieuwe ticket — ${args.orgName}`,
          description: "Inhoud en afzender staan in het admin-paneel.",
          color:
            args.priority === "URGENT"
              ? DISCORD_COLORS.danger
              : args.priority === "HIGH"
                ? DISCORD_COLORS.warning
                : DISCORD_COLORS.bookingbay,
          url: `${env.APP_URL}/admin/support/${args.ticketId}`,
          fields: [
            { name: "Organisatie", value: args.orgName, inline: true },
            { name: "Categorie", value: args.category, inline: true },
            { name: "Prioriteit", value: args.priority, inline: true },
          ],
          footer: { text: `ticket-id: ${args.ticketId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "support",
  );
}

interface TicketReplyArgs {
  ticketId: string;
  orgName: string;
  isStaff: boolean;
}

export function notifyTicketReply(args: TicketReplyArgs) {
  if (args.isStaff) {
    // Staff replies originate from inside the admin UI — no point pinging
    // ourselves in Discord. Skip silently.
    return Promise.resolve(false);
  }
  return notifyDiscord(
    {
      username: "BookingBay · Support",
      embeds: [
        {
          title: `💬 Nieuwe reactie van klant — ${args.orgName}`,
          description: "Bekijk de reactie in het admin-paneel.",
          color: DISCORD_COLORS.info,
          url: `${env.APP_URL}/admin/support/${args.ticketId}`,
          fields: [{ name: "Organisatie", value: args.orgName, inline: true }],
          footer: { text: `ticket-id: ${args.ticketId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "support",
  );
}

/* --------------------------- CRM CHANNEL --------------------------- */

interface NewLeadArgs {
  leadId: string;
  orgId: string;
  orgName: string;
  itemName?: string | null;
}

export function notifyNewLead(args: NewLeadArgs) {
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `📥 Nieuwe lead voor ${args.orgName}`,
          description: "Contactgegevens en bericht staan alleen in het dashboard van de organisatie.",
          color: DISCORD_COLORS.success,
          url: `${env.APP_URL}/admin/organizations/${args.orgId}`,
          fields: args.itemName
            ? [{ name: "Item", value: args.itemName, inline: true }]
            : [],
          footer: { text: `lead-id: ${args.leadId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface NewSignupArgs {
  orgId: string;
  orgName: string;
  orgSlug: string;
  industry?: string | null;
}

export function notifyNewSignup(args: NewSignupArgs) {
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `🎉 Nieuwe organisatie — ${args.orgName}`,
          color: DISCORD_COLORS.success,
          url: `${env.APP_URL}/admin/organizations/${args.orgId}`,
          fields: [
            { name: "Slug", value: args.orgSlug, inline: true },
            ...(args.industry
              ? [{ name: "Branche", value: args.industry, inline: true }]
              : []),
          ],
          footer: { text: `org-id: ${args.orgId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface PaymentIssueArgs {
  orgId: string;
  orgName: string;
  stage: "reminder-3d" | "reminder-1d" | "reminder-today" | "suspended";
  daysOverdue?: number;
}

export function notifyPaymentIssue(args: PaymentIssueArgs) {
  const stageLabels: Record<PaymentIssueArgs["stage"], string> = {
    "reminder-3d": "⏰ Betaling verloopt over 3 dagen",
    "reminder-1d": "⏰ Betaling verloopt morgen",
    "reminder-today": "⚠️ Betaling verloopt vandaag",
    suspended: "🛑 Organisatie geschorst (betaling te laat)",
  };
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `${stageLabels[args.stage]} — ${args.orgName}`,
          color:
            args.stage === "suspended"
              ? DISCORD_COLORS.danger
              : args.stage === "reminder-today"
                ? DISCORD_COLORS.warning
                : DISCORD_COLORS.info,
          url: `${env.APP_URL}/admin/organizations/${args.orgId}`,
          fields:
            args.daysOverdue !== undefined
              ? [
                  {
                    name: "Dagen te laat",
                    value: String(args.daysOverdue),
                    inline: true,
                  },
                ]
              : [],
          footer: { text: `org-id: ${args.orgId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

/** Label voor een prospect zonder persoonsgegevens: bedrijfsnaam of id. */
function prospectLabel(args: { prospectId: string; companyName?: string | null }): string {
  return args.companyName?.trim() || `prospect ${args.prospectId.slice(-6)}`;
}

interface NewProspectArgs {
  prospectId: string;
  companyName?: string | null;
  source?: string | null;
}

export function notifyNewProspect(args: NewProspectArgs) {
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `🆕 Nieuwe prospect — ${prospectLabel(args)}`,
          color: DISCORD_COLORS.info,
          url: `${env.APP_URL}/admin/crm/${args.prospectId}`,
          fields: args.source
            ? [{ name: "Bron", value: args.source, inline: true }]
            : [],
          footer: { text: `prospect-id: ${args.prospectId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface ProspectStatusChangeArgs {
  prospectId: string;
  companyName?: string | null;
  fromStatus: string;
  toStatus: string;
}

const STATUS_EMOJI: Record<string, string> = {
  lead: "👤",
  gecontacteerd: "📞",
  "demo-gepland": "📅",
  "demo-gehad": "🎬",
  voorstel: "📄",
  gewonnen: "🏆",
  verloren: "❌",
};

export function notifyProspectStatusChange(args: ProspectStatusChangeArgs) {
  const emoji = STATUS_EMOJI[args.toStatus] ?? "🔄";
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `${emoji} ${prospectLabel(args)} → ${args.toStatus}`,
          description: `Pipeline-status: \`${args.fromStatus}\` → \`${args.toStatus}\``,
          color:
            args.toStatus === "gewonnen"
              ? DISCORD_COLORS.success
              : args.toStatus === "verloren"
                ? DISCORD_COLORS.neutral
                : DISCORD_COLORS.info,
          url: `${env.APP_URL}/admin/crm/${args.prospectId}`,
          footer: { text: `prospect-id: ${args.prospectId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface ReminderCreatedArgs {
  kind: "org" | "prospect";
  reminderId: string;
  dueAt: Date;
  /** Organisatienaam of bedrijfsnaam — geen persoonsnamen. */
  contextLabel: string;
  contextUrl: string;
}

export function notifyReminderCreated(args: ReminderCreatedArgs) {
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `📌 Follow-up gepland — ${args.contextLabel}`,
          color: DISCORD_COLORS.info,
          url: args.contextUrl,
          fields: [
            { name: "Type", value: args.kind === "org" ? "Klant" : "Prospect", inline: true },
            { name: "Due", value: args.dueAt.toISOString(), inline: true },
          ],
          footer: { text: `reminder-id: ${args.reminderId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface InteractionLoggedArgs {
  kind: "org" | "prospect";
  interactionId: string;
  type: string; // "call" | "email" | "meeting" | "note"
  occurredAt: Date;
  /** Organisatienaam of bedrijfsnaam — geen persoonsnamen. */
  contextLabel: string;
  contextUrl: string;
}

const INTERACTION_EMOJI: Record<string, string> = {
  call: "📞",
  email: "✉️",
  meeting: "🤝",
  note: "📝",
};

export function notifyInteractionLogged(args: InteractionLoggedArgs) {
  const emoji = INTERACTION_EMOJI[args.type] ?? "📌";
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `${emoji} Interactie gelogd — ${args.contextLabel}`,
          color: DISCORD_COLORS.neutral,
          url: args.contextUrl,
          fields: [
            { name: "Type", value: args.type, inline: true },
            { name: "Wanneer", value: args.occurredAt.toISOString(), inline: true },
          ],
          footer: { text: `interaction-id: ${args.interactionId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface CrmDailyDigestArgs {
  date: Date;
  newProspects: number;
  newLeads: number;
  newSignups: number;
  interactionsLogged: number;
  remindersCreated: number;
  remindersCompleted: number;
  remindersOpenToday: number;
  remindersOverdue: number;
  statusChanges: number;
  newTickets: number;
}

export function notifyCrmDailyDigest(args: CrmDailyDigestArgs) {
  const dateLabel = args.date.toISOString().slice(0, 10);
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
  const push = (name: string, value: number, inline = true) => {
    if (value > 0) fields.push({ name, value: String(value), inline });
  };
  push("Nieuwe prospects", args.newProspects);
  push("Nieuwe leads", args.newLeads);
  push("Nieuwe signups", args.newSignups);
  push("Interacties gelogd", args.interactionsLogged);
  push("Follow-ups gepland", args.remindersCreated);
  push("Follow-ups afgerond", args.remindersCompleted);
  push("Status-changes", args.statusChanges);
  push("Nieuwe tickets", args.newTickets);
  push("Open follow-ups vandaag", args.remindersOpenToday);
  if (args.remindersOverdue > 0)
    fields.push({
      name: "🔴 Te laat",
      value: String(args.remindersOverdue),
      inline: true,
    });

  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `📊 CRM-dagrapport — ${dateLabel}`,
          description:
            fields.length === 0
              ? "Geen activiteit vandaag."
              : "Wat er vandaag is gebeurd in de CRM:",
          color:
            args.remindersOverdue > 0
              ? DISCORD_COLORS.warning
              : DISCORD_COLORS.info,
          fields,
          footer: { text: "Dagelijkse digest" },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

interface ReminderDueArgs {
  kind: "org" | "prospect";
  reminderId: string;
  dueAt: Date;
  overdue: boolean;
  /** Organisatienaam of bedrijfsnaam — geen persoonsnamen. */
  contextLabel: string;
  contextUrl: string;
}

export function notifyReminderDue(args: ReminderDueArgs) {
  const emoji = args.overdue ? "🔴" : args.kind === "org" ? "🔔" : "📌";
  const titlePrefix = args.overdue ? "Te laat" : "Open";
  return notifyDiscord(
    {
      username: "BookingBay · CRM",
      embeds: [
        {
          title: `${emoji} ${titlePrefix}: follow-up — ${args.contextLabel}`,
          color: args.overdue ? DISCORD_COLORS.danger : DISCORD_COLORS.warning,
          url: args.contextUrl,
          fields: [
            { name: "Type", value: args.kind === "org" ? "Klant" : "Prospect", inline: true },
            { name: "Due", value: args.dueAt.toISOString(), inline: true },
          ],
          footer: { text: `reminder-id: ${args.reminderId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    "crm",
  );
}

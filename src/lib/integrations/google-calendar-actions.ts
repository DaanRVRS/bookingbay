"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import {
  listCalendars,
  type GoogleCalendarConfig,
} from "./google-calendar";
import {
  ensureWatchAndInitialSync,
  stopWatchForCalendar,
} from "./calendar-sync";

/**
 * Vraagt de gebruikers-agendalijst op bij Google en cachet 'm op de
 * OrgIntegration. UI-component roept dit aan zodat de dropdown altijd
 * up-to-date is met agenda's die de klant in Google heeft.
 */
export async function refreshGoogleCalendarListAction(): Promise<
  ActionResult<{ count: number }>
> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const row = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: ctx.organization.id,
        integrationKey: "google-calendar",
      },
    },
  });
  if (!row || row.status !== "ACTIVE") {
    return { ok: false, error: "Google Calendar is niet actief." };
  }

  try {
    const calendars = await listCalendars(ctx.organization.id);
    const cfg = (row.config as Record<string, unknown> | null) ?? {};
    const updated: Record<string, unknown> = {
      ...cfg,
      calendars,
      calendarsCachedAt: Date.now(),
    };
    await db.orgIntegration.update({
      where: { id: row.id },
      data: { config: updated as Prisma.InputJsonValue },
    });

    revalidatePath("/dashboard/integrations/google-calendar");
    return { ok: true, data: { count: calendars.length } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 300) : "Onbekende fout",
    };
  }
}

const setOrgCalendarSchema = z.object({
  calendarId: z.string().min(1).max(500),
});

/**
 * Zet de organisatie-brede default calendar. Items zonder eigen override
 * gebruiken deze. Ook waar we de watch-channel op zetten voor real-time
 * sync.
 */
export async function setOrgGoogleCalendarAction(
  input: z.infer<typeof setOrgCalendarSchema>,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = setOrgCalendarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const row = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: ctx.organization.id,
        integrationKey: "google-calendar",
      },
    },
  });
  if (!row || row.status !== "ACTIVE") {
    return { ok: false, error: "Google Calendar is niet actief." };
  }

  const cfg = ((row.config as Record<string, unknown> | null) ??
    {}) as GoogleCalendarConfig;
  const previousCalendarId = cfg.calendarId;

  if (previousCalendarId === parsed.data.calendarId) {
    return { ok: true };
  }

  // Tokens zijn al encrypted in de DB-config; sealConfig idempotent her-
  // versleutelen zou ze breken. We updaten gewoon het plaintext-veld.
  const updated: Record<string, unknown> = {
    ...(row.config as Record<string, unknown>),
    calendarId: parsed.data.calendarId,
  };
  await db.orgIntegration.update({
    where: { id: row.id },
    data: { config: updated as Prisma.InputJsonValue },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "integration.google-calendar.default-calendar.set",
    resource: "integration",
    resourceId: "google-calendar",
    metadata: { calendarId: parsed.data.calendarId, previous: previousCalendarId },
  });

  // Stop watch op de oude default (als 'ie nergens anders meer gebruikt
  // wordt), start watch op de nieuwe.
  if (previousCalendarId && previousCalendarId !== parsed.data.calendarId) {
    await stopWatchForCalendar(ctx.organization.id, previousCalendarId).catch(
      () => {},
    );
  }
  await ensureWatchAndInitialSync(ctx.organization.id, parsed.data.calendarId).catch(
    () => {},
  );

  revalidatePath("/dashboard/integrations/google-calendar");
  return { ok: true };
}

const setItemCalendarSchema = z.object({
  itemId: z.string().min(1),
  calendarId: z.string().nullable(),
});

/**
 * Per-item override van welke Google Calendar gebruikt wordt. Null =
 * gebruik org-default. Bij ongedaan maken stoppen we het watch-channel
 * voor de oude calendar als 'ie nergens anders meer gebruikt wordt.
 */
export async function setItemGoogleCalendarAction(
  input: z.infer<typeof setItemCalendarSchema>,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");

  const parsed = setItemCalendarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const item = await db.item.findFirst({
    where: { id: parsed.data.itemId, organizationId: ctx.organization.id },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  const existingCfg = (item.integrationConfig as Record<string, unknown> | null) ?? {};
  const existingGc =
    (existingCfg.googleCalendar as { calendarId?: string } | undefined) ?? {};
  const oldCalendarId = existingGc.calendarId ?? null;

  if (oldCalendarId === parsed.data.calendarId) return { ok: true };

  let newCfg: Record<string, unknown> | null = { ...existingCfg };
  if (parsed.data.calendarId) {
    newCfg.googleCalendar = { calendarId: parsed.data.calendarId };
  } else {
    delete (newCfg as Record<string, unknown>).googleCalendar;
    if (Object.keys(newCfg).length === 0) newCfg = null;
  }

  await db.item.update({
    where: { id: item.id },
    data: {
      integrationConfig:
        newCfg === null
          ? Prisma.JsonNull
          : (newCfg as Prisma.InputJsonValue),
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "integration.google-calendar.item-calendar.set",
    resource: "item",
    resourceId: item.id,
    metadata: { calendarId: parsed.data.calendarId, previous: oldCalendarId },
  });

  // Pas watch-channels aan. Idempotent — als 'ie al loopt, geen werk.
  if (parsed.data.calendarId) {
    await ensureWatchAndInitialSync(ctx.organization.id, parsed.data.calendarId).catch(
      () => {},
    );
  }
  if (oldCalendarId) {
    await stopWatchForCalendar(ctx.organization.id, oldCalendarId).catch(() => {});
  }

  revalidatePath("/dashboard/integrations/google-calendar");
  revalidatePath(`/dashboard/items/${item.id}`);
  return { ok: true };
}

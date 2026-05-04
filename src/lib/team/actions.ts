"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import {
  inviteSchema,
  updateRoleSchema,
  removeMemberSchema,
  acceptInviteSchema,
  type InviteInput,
  type UpdateRoleInput,
  type RemoveMemberInput,
} from "./schemas";
import type { ActionResult } from "@/lib/auth/schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

function token(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export async function inviteMemberAction(input: InviteInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "members:invite");

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();

  // Already a member?
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId: ctx.organization.id,
        },
      },
    });
    if (existingMembership) {
      return {
        ok: false,
        error: "Deze persoon is al lid van de werkruimte",
        fieldErrors: { email: "Al lid" },
      };
    }
  }

  // Existing pending invite?
  const existingInvite = await db.invitation.findUnique({
    where: {
      organizationId_email: {
        organizationId: ctx.organization.id,
        email,
      },
    },
  });

  const inviteToken = token();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (existingInvite && !existingInvite.acceptedAt) {
    // Refresh existing invite — new token + extend expiry
    await db.invitation.update({
      where: { id: existingInvite.id },
      data: {
        role: parsed.data.role,
        token: inviteToken,
        expires,
        invitedById: ctx.user.id,
      },
    });
  } else if (existingInvite && existingInvite.acceptedAt) {
    return {
      ok: false,
      error: "Eerdere uitnodiging is al geaccepteerd",
    };
  } else {
    await db.invitation.create({
      data: {
        organizationId: ctx.organization.id,
        email,
        role: parsed.data.role,
        token: inviteToken,
        expires,
        invitedById: ctx.user.id,
      },
    });
  }

  const inviteUrl = `${env.APP_URL}/invite/${inviteToken}`;
  const inviterName = ctx.user.name ?? ctx.user.email;

  await sendEmail({
    to: email,
    subject: `Je bent uitgenodigd voor ${ctx.organization.name} op BookingBay`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Je bent uitgenodigd</h1>
      <p style="margin:0 0 16px 0">
        ${inviterName} heeft je uitgenodigd om mee te werken in
        <strong>${ctx.organization.name}</strong> op BookingBay.
      </p>
      <p style="margin:0 0 24px 0">${btn(inviteUrl, "Uitnodiging accepteren")}</p>
      <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;word-break:break-all">
        Werkt de knop niet? Gebruik deze link:<br>
        ${inviteUrl}
      </p>
      <p style="margin:16px 0 0 0;font-size:12px;color:#6b7280">
        De uitnodiging verloopt na 7 dagen.
      </p>
    `),
    text: `Je bent uitgenodigd voor ${ctx.organization.name}. Accepteer via: ${inviteUrl}`,
  });

  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function cancelInviteAction(invitationId: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "members:invite");

  const invite = await db.invitation.findFirst({
    where: { id: invitationId, organizationId: ctx.organization.id },
  });
  if (!invite) return { ok: false, error: "Uitnodiging niet gevonden" };

  await db.invitation.delete({ where: { id: invitationId } });
  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function updateRoleAction(input: UpdateRoleInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "members:manage");

  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const target = await db.membership.findFirst({
    where: { id: parsed.data.membershipId, organizationId: ctx.organization.id },
  });
  if (!target) return { ok: false, error: "Lid niet gevonden" };

  // Only OWNER may grant/revoke OWNER
  if ((parsed.data.role === "OWNER" || target.role === "OWNER") && ctx.membership.role !== "OWNER") {
    return { ok: false, error: "Alleen een Eigenaar mag een Eigenaar promoten of degraderen" };
  }

  // Prevent demoting yourself if you're the only OWNER
  if (target.userId === ctx.user.id && target.role === "OWNER" && parsed.data.role !== "OWNER") {
    const ownerCount = await db.membership.count({
      where: { organizationId: ctx.organization.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false, error: "Je bent de enige Eigenaar — promoot eerst iemand anders" };
    }
  }

  await db.membership.update({
    where: { id: parsed.data.membershipId },
    data: { role: parsed.data.role },
  });

  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function removeMemberAction(input: RemoveMemberInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "members:manage");

  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }

  const target = await db.membership.findFirst({
    where: { id: parsed.data.membershipId, organizationId: ctx.organization.id },
  });
  if (!target) return { ok: false, error: "Lid niet gevonden" };

  // Cannot remove the only OWNER
  if (target.role === "OWNER") {
    const ownerCount = await db.membership.count({
      where: { organizationId: ctx.organization.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false, error: "Kan niet de enige Eigenaar verwijderen" };
    }
    if (ctx.membership.role !== "OWNER") {
      return { ok: false, error: "Alleen een Eigenaar mag een Eigenaar verwijderen" };
    }
  }

  await db.membership.delete({ where: { id: parsed.data.membershipId } });
  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function acceptInviteAction(input: { token: string }): Promise<
  ActionResult<{ organizationSlug: string }>
> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldig token" };

  // The user has to be logged in to accept
  const session = await import("@/lib/auth").then((m) => m.auth());
  if (!session?.user?.id) return { ok: false, error: "Log eerst in" };

  const invite = await db.invitation.findUnique({
    where: { token: parsed.data.token },
    include: { organization: { select: { slug: true } } },
  });
  if (!invite) return { ok: false, error: "Uitnodiging niet gevonden of al gebruikt" };
  if (invite.acceptedAt) return { ok: false, error: "Uitnodiging is al geaccepteerd" };
  if (invite.expires < new Date()) {
    return { ok: false, error: "Uitnodiging is verlopen — vraag een nieuwe aan" };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user) return { ok: false, error: "Account niet gevonden" };

  // Email must match (case-insensitive)
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      ok: false,
      error: `Deze uitnodiging is voor ${invite.email}. Log in met dat adres.`,
    };
  }

  await db.$transaction(async (tx) => {
    // Create membership if not exists
    await tx.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invite.organizationId,
        },
      },
      create: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
      update: { role: invite.role },
    });
    await tx.invitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return { ok: true, data: { organizationSlug: invite.organization.slug } };
}

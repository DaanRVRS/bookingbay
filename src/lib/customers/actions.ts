"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import {
  customerCreateSchema,
  customerUpdateSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
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

export async function createCustomerAction(
  input: CustomerCreateInput,
): Promise<ActionResult<{ id: string; name: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const created = await db.customer.create({
    data: {
      organizationId: ctx.organization.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
    select: { id: true, name: true },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  return { ok: true, data: created };
}

export async function updateCustomerAction(input: CustomerUpdateInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const parsed = customerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.customer.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.customer.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${parsed.data.id}`);
  return { ok: true };
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const existing = await db.customer.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  if (existing._count.bookings > 0) {
    return {
      ok: false,
      error: `Klant heeft ${existing._count.bookings} boeking${existing._count.bookings === 1 ? "" : "en"} — niet te verwijderen`,
    };
  }

  await db.customer.delete({ where: { id } });
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}

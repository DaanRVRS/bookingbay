import "server-only";
import { db } from "@/lib/db";

export interface AuditEvent {
  organizationId?: string | null;
  actorUserId?: string | null;
  /** Friendly key — e.g. "item.create", "org.plan.change". */
  action: string;
  /** "item", "booking", "organization", … */
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget log helper. Errors are swallowed so a logging failure
 * never breaks the user-facing action that triggered it.
 */
export async function audit(event: AuditEvent): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: event.organizationId ?? null,
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata ? (event.metadata as never) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}

/** Friendly Dutch labels for known action keys. */
export const ACTION_LABELS: Record<string, string> = {
  "item.create": "Item toegevoegd",
  "item.update": "Item bewerkt",
  "item.delete": "Item verwijderd",
  "category.create": "Categorie toegevoegd",
  "category.update": "Categorie bewerkt",
  "category.delete": "Categorie verwijderd",
  "category.reorder": "Categorieën gesorteerd",
  "booking.create": "Boeking aangemaakt",
  "booking.update": "Boeking bewerkt",
  "booking.cancel": "Boeking geannuleerd",
  "booking.status": "Boeking-status gewijzigd",
  "customer.create": "Klant toegevoegd",
  "customer.update": "Klant bewerkt",
  "customer.delete": "Klant verwijderd",
  "lead.create": "Lead binnengekomen",
  "lead.handle": "Lead afgehandeld",
  "lead.delete": "Lead verwijderd",
  "leadblock.add": "Adres geblokkeerd",
  "leadblock.remove": "Blokkade opgeheven",
  "member.invite": "Lid uitgenodigd",
  "member.invite.cancel": "Uitnodiging ingetrokken",
  "member.role.update": "Rol gewijzigd",
  "member.remove": "Lid verwijderd",
  "member.invite.accept": "Uitnodiging geaccepteerd",
  "org.update": "Organisatie bijgewerkt",
  "org.delete": "Organisatie verwijderd",
  "org.plan.change": "Plan gewijzigd",
  "org.trial.extend": "Trial verlengd",
  "org.payment.extend": "Betaalde periode verlengd",
  "org.payment.reminder.in-3-days": "Reminder verstuurd (3 dagen vooraf)",
  "org.payment.reminder.tomorrow": "Reminder verstuurd (1 dag vooraf)",
  "org.payment.reminder.today": "Reminder verstuurd (verlengdatum)",
  "org.subscription.suspended": "Abonnement automatisch gestopt",
  "org.subscription.unsuspend": "Suspensie opgeheven",
  "site.update": "Klantsite bijgewerkt",
  "page.create": "Pagina aangemaakt",
  "page.update": "Pagina bewerkt",
  "page.delete": "Pagina verwijderd",
  "review.create": "Review toegevoegd",
  "review.update": "Review bewerkt",
  "review.delete": "Review verwijderd",
  "user.admin.grant": "Platform-admin toegekend",
  "user.admin.revoke": "Platform-admin ingetrokken",
  "admin.impersonate.start": "Inloggen-als gestart",
  "admin.impersonate.stop": "Inloggen-als gestopt",
};

export function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

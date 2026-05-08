import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Mail, MessageCircle, Phone, StickyNote } from "lucide-react";
import {
  listInteractionsForOrg,
  listOpenRemindersForOrg,
  listCompletedRemindersForOrg,
  CRM_STATUSES,
  describeStatus,
  safeTags,
} from "@/lib/admin/crm/queries";
import { db } from "@/lib/db";
import { CrmStatusPicker } from "./crm-status-picker";
import { CrmTagsEditor } from "./crm-tags-editor";
import { CrmInteractionForm } from "./crm-interaction-form";
import { CrmReminderForm } from "./crm-reminder-form";
import { CrmReminderActions } from "./crm-reminder-actions";
import { CrmInteractionActions } from "./crm-interaction-actions";

const TYPE_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
} as const;
const TYPE_LABELS = {
  call: "Telefoon",
  email: "E-mail",
  meeting: "Afspraak",
  note: "Notitie",
} as const;

export async function CrmSection({
  organizationId,
  crmStatus,
  crmTags,
}: {
  organizationId: string;
  crmStatus: string;
  crmTags: unknown;
}) {
  const tags = safeTags(crmTags);

  const [interactions, openReminders, completedReminders, admins] =
    await Promise.all([
      listInteractionsForOrg(organizationId),
      listOpenRemindersForOrg(organizationId),
      listCompletedRemindersForOrg(organizationId, 10),
      // Pool of users who can be assigned to a reminder = platform admins
      db.user.findMany({
        where: { isAdmin: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const status = describeStatus(crmStatus);

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">CRM</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Track gesprekken, plan follow-ups, en beheer de status van deze
            klant in onze pipeline.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ background: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* Status + tags */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <div className="mt-2">
            <CrmStatusPicker
              organizationId={organizationId}
              current={crmStatus}
              statuses={CRM_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </p>
          <div className="mt-2">
            <CrmTagsEditor organizationId={organizationId} initial={tags} />
          </div>
        </div>
      </div>

      {/* Open reminders */}
      <div className="mt-7">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Open follow-ups
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {openReminders.length}
            </span>
          </h3>
        </div>
        <div className="mt-3">
          <CrmReminderForm organizationId={organizationId} admins={admins} />
        </div>
        {openReminders.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border bg-background/40 px-4 py-6 text-center text-xs text-muted-foreground">
            Geen open follow-ups.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-background/30">
            {openReminders.map((r) => {
              const overdue = r.dueAt < new Date();
              return (
                <li key={r.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium">{r.title}</span>
                      <span
                        className={`text-xs tabular-nums ${
                          overdue ? "font-medium text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {overdue ? "Te laat — " : ""}
                        {format(r.dueAt, "EEE d MMM HH:mm", { locale: nl })}
                      </span>
                    </div>
                    {r.notes && (
                      <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                    {r.assignedTo && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Toegewezen aan{" "}
                        <span className="font-medium">
                          {r.assignedTo.name ?? r.assignedTo.email}
                        </span>
                      </p>
                    )}
                  </div>
                  <CrmReminderActions id={r.id} completed={false} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Interactions timeline */}
      <div className="mt-7">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Interacties
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {interactions.length}
            </span>
          </h3>
        </div>
        <div className="mt-3">
          <CrmInteractionForm organizationId={organizationId} />
        </div>
        {interactions.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-border bg-background/40 px-4 py-6 text-center text-xs text-muted-foreground">
            Nog geen interacties gelogd.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {interactions.map((it) => {
              const Icon =
                TYPE_ICONS[it.type as keyof typeof TYPE_ICONS] ?? StickyNote;
              const typeLabel =
                TYPE_LABELS[it.type as keyof typeof TYPE_LABELS] ?? it.type;
              return (
                <li
                  key={it.id}
                  className="flex items-start gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {typeLabel}
                      </span>
                      <span className="truncate text-sm font-medium">{it.subject}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDistanceToNow(it.occurredAt, {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </span>
                    </div>
                    {it.body && (
                      <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                        {it.body}
                      </p>
                    )}
                    {it.actor && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Door {it.actor.name ?? it.actor.email}
                      </p>
                    )}
                  </div>
                  <CrmInteractionActions id={it.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Completed reminders (collapsible-ish, just compact) */}
      {completedReminders.length > 0 && (
        <details className="mt-6 group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Recent afgerond ({completedReminders.length})
          </summary>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-background/30">
            {completedReminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground"
              >
                <span className="line-through">{r.title}</span>
                <span className="ml-auto tabular-nums">
                  {r.completedAt &&
                    format(r.completedAt, "d MMM", { locale: nl })}
                </span>
                <CrmReminderActions id={r.id} completed={true} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

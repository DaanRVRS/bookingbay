import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  PROSPECT_STATUSES,
  describeProspectStatus,
  getProspectById,
  listInteractionsForProspect,
  listOpenRemindersForProspect,
  listCompletedRemindersForProspect,
  safeTags,
} from "@/lib/admin/prospects/queries";
import { ProspectStatusPicker } from "./prospect-status-picker";
import { ProspectTagsEditor } from "./prospect-tags-editor";
import { ProspectInteractionForm } from "./prospect-interaction-form";
import { ProspectReminderForm } from "./prospect-reminder-form";
import { ProspectInteractionActions } from "./prospect-interaction-actions";
import { ProspectReminderActions } from "./prospect-reminder-actions";
import { ProspectConvertButton } from "./prospect-convert-button";
import { ProspectEditForm } from "./prospect-edit-form";

export const metadata = { title: "Prospect" };

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const prospect = await getProspectById(id);
  if (!prospect) notFound();

  const [interactions, openReminders, completedReminders, admins, organizations] =
    await Promise.all([
      listInteractionsForProspect(id),
      listOpenRemindersForProspect(id),
      listCompletedRemindersForProspect(id),
      db.user.findMany({
        where: { isAdmin: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      // Used by the "Convert" button to pick an existing org
      db.organization.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const tags = safeTags(prospect.tags);
  const status = describeProspectStatus(prospect.status);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/crm"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Alle prospects
        </Link>

        {/* Header */}
        <div className="mt-4 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{prospect.name}</h1>
            {prospect.companyName && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="size-3.5" />
                {prospect.companyName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {prospect.email && (
                <a
                  href={`mailto:${prospect.email}`}
                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  <Mail className="size-3" /> {prospect.email}
                </a>
              )}
              {prospect.phone && (
                <a
                  href={`tel:${prospect.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  <Phone className="size-3" /> {prospect.phone}
                </a>
              )}
              {prospect.source && (
                <span>Bron: {prospect.source}</span>
              )}
            </div>
            {prospect.convertedOrg && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-xs">
                <span className="font-medium">Gekoppeld aan</span>
                <Link
                  href={`/admin/organizations/${prospect.convertedOrg.id}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {prospect.convertedOrg.name}
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            )}
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ background: status.color }}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-6">
            {/* Status + tags + edit + convert */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-2">
                    <ProspectStatusPicker
                      prospectId={prospect.id}
                      current={prospect.status}
                      statuses={PROSPECT_STATUSES.map((s) => ({
                        value: s.value,
                        label: s.label,
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags
                  </p>
                  <div className="mt-2">
                    <ProspectTagsEditor prospectId={prospect.id} initial={tags} />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                {!prospect.convertedOrg && (
                  <ProspectConvertButton
                    prospectId={prospect.id}
                    organizations={organizations}
                  />
                )}
                <ProspectEditForm
                  initial={{
                    id: prospect.id,
                    name: prospect.name,
                    companyName: prospect.companyName ?? "",
                    email: prospect.email ?? "",
                    phone: prospect.phone ?? "",
                    source: prospect.source ?? "",
                    notes: prospect.notes ?? "",
                  }}
                />
              </div>
            </section>

            {/* Open reminders */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  Open follow-ups
                  <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {openReminders.length}
                  </span>
                </h2>
              </div>
              <div className="mt-3">
                <ProspectReminderForm prospectId={prospect.id} admins={admins} />
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
                                overdue
                                  ? "font-medium text-destructive"
                                  : "text-muted-foreground"
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
                        <ProspectReminderActions id={r.id} completed={false} />
                      </li>
                    );
                  })}
                </ul>
              )}
              {completedReminders.length > 0 && (
                <details className="mt-4">
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
                        <ProspectReminderActions id={r.id} completed={true} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>

            {/* Interactions */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  Interacties
                  <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {interactions.length}
                  </span>
                </h2>
              </div>
              <div className="mt-3">
                <ProspectInteractionForm prospectId={prospect.id} />
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
                            <span className="truncate text-sm font-medium">
                              {it.subject}
                            </span>
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
                        <ProspectInteractionActions id={it.id} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Side panel: notes + meta */}
          <aside className="flex flex-col gap-4 text-sm">
            {prospect.notes && (
              <section className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notities
                </p>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {prospect.notes}
                </p>
              </section>
            )}
            <section className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
              <p>
                <span className="text-foreground">Aangemaakt</span> door{" "}
                {prospect.createdBy?.name ?? prospect.createdBy?.email ?? "—"}
                <br />
                {format(prospect.createdAt, "d MMM yyyy HH:mm", { locale: nl })}
              </p>
              {prospect.owner && (
                <p className="mt-2">
                  <span className="text-foreground">Eigenaar:</span>{" "}
                  {prospect.owner.name ?? prospect.owner.email}
                </p>
              )}
              {prospect.convertedAt && (
                <p className="mt-2 text-primary">
                  Gewonnen op{" "}
                  {format(prospect.convertedAt, "d MMM yyyy", { locale: nl })}
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Headset } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { requireAdmin } from "@/lib/auth/session";
import { getTicketForAdmin } from "@/lib/support/queries";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
} from "@/lib/support/schemas";
import { StaffReplyForm } from "../staff-reply-form";
import { TicketAdminControls } from "../ticket-admin-controls";
import { TicketAutoRefresh } from "@/app/dashboard/support/ticket-auto-refresh";

export const metadata = { title: "Ticket" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABEL = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

export default async function AdminTicketDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const ticket = await getTicketForAdmin(id);
  if (!ticket) notFound();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Alle tickets
        </Link>

        <div className="mt-3 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {ticket.subject}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link
                href={`/admin/organizations/${ticket.organization.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {ticket.organization.name}
              </Link>
              <span className="mx-1.5">·</span>
              {ticket.createdBy?.name ?? ticket.createdBy?.email ?? "—"}
              <span className="mx-1.5">·</span>
              {format(ticket.createdAt, "d MMM yyyy HH:mm", { locale: nl })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                {STATUS_LABELS[ticket.status]}
              </span>
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {CATEGORY_LABEL[ticket.category] ?? ticket.category}
              </span>
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {PRIORITY_LABELS[ticket.priority]}
              </span>
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Plan: {ticket.organization.plan}
              </span>
            </div>
          </div>

          <TicketAdminControls
            ticketId={ticket.id}
            status={ticket.status}
            priority={ticket.priority}
          />
        </div>

        <TicketAutoRefresh
          ticketId={ticket.id}
          initialMessageCount={ticket.messages.length}
          initialLastStaffReplyAt={ticket.lastStaffReplyAt?.toISOString() ?? null}
          initialLastUserReplyAt={ticket.lastUserReplyAt?.toISOString() ?? null}
          mode="staff"
        />

        <ol className="mt-6 flex flex-col gap-3">
          {ticket.messages.map((m) => {
            const isStaff = m.isStaff;
            return (
              <li
                key={m.id}
                className={`overflow-hidden rounded-xl border ${
                  isStaff
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-2 px-5 py-2 text-xs ${
                    isStaff
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    {isStaff ? (
                      <>
                        <Headset className="size-3.5" />
                        BookingBay Support
                        <span className="font-normal opacity-70">
                          · {m.author?.name ?? m.author?.email ?? ""}
                        </span>
                      </>
                    ) : (
                      m.author?.name ?? m.author?.email ?? "—"
                    )}
                  </span>
                  <span className="tabular-nums opacity-70">
                    {format(parseISO(m.createdAt.toISOString()), "d MMM HH:mm", {
                      locale: nl,
                    })}
                  </span>
                </div>
                <p className="px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {m.body}
                </p>
              </li>
            );
          })}
        </ol>

        {ticket.status === "CLOSED" ? (
          <p className="mt-6 rounded-xl border border-dashed border-border bg-card/40 px-5 py-6 text-center text-sm text-muted-foreground">
            Deze ticket is gesloten. Zet de status terug op &ldquo;Open&rdquo;
            om te kunnen reageren.
          </p>
        ) : (
          <div className="mt-6">
            <StaffReplyForm ticketId={ticket.id} />
          </div>
        )}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Headset } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { requireOrg } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { getTicketForOrg } from "@/lib/support/queries";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
} from "@/lib/support/schemas";
import { ReplyForm } from "../reply-form";
import { TicketAutoRefresh } from "../ticket-auto-refresh";

export const metadata = { title: "Ticket" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABEL = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

export default async function TicketDetailPage({ params }: PageProps) {
  const ctx = await requireOrg();
  const { id } = await params;
  const ticket = await getTicketForOrg(ctx.organization.id, id);
  if (!ticket) notFound();

  const closed = ticket.status === "CLOSED" || ticket.status === "RESOLVED";

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <TicketAutoRefresh
        ticketId={ticket.id}
        initialMessageCount={ticket.messages.length}
        initialLastStaffReplyAt={ticket.lastStaffReplyAt?.toISOString() ?? null}
        initialLastUserReplyAt={ticket.lastUserReplyAt?.toISOString() ?? null}
        mode="klant"
      />
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title={ticket.subject}
          description={`Geopend door ${ticket.createdBy?.name ?? ticket.createdBy?.email ?? "—"} · ${format(
            ticket.createdAt,
            "d MMM yyyy HH:mm",
            { locale: nl },
          )}`}
          back={{ href: "/dashboard/support", label: "Alle tickets" }}
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {CATEGORY_LABEL[ticket.category] ?? ticket.category}
          </span>
          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Prioriteit: {PRIORITY_LABELS[ticket.priority]}
          </span>
        </div>

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

        {closed ? (
          <p className="mt-6 rounded-xl border border-dashed border-border bg-card/40 px-5 py-6 text-center text-sm text-muted-foreground">
            Deze ticket is {STATUS_LABELS[ticket.status].toLowerCase()}. Open
            een nieuwe ticket als je nog vragen hebt.
          </p>
        ) : (
          <div className="mt-6">
            <ReplyForm ticketId={ticket.id} />
          </div>
        )}
      </div>
    </div>
  );
}

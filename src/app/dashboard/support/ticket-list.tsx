"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowRight, MessageCircle } from "lucide-react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
} from "@/lib/support/schemas";

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: keyof typeof STATUS_LABELS;
  priority: keyof typeof PRIORITY_LABELS;
  createdByName: string | null;
  createdByEmail: string | null;
  createdById: string | null;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
}

const CATEGORY_LABEL = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

const STATUS_STYLES: Record<keyof typeof STATUS_LABELS, string> = {
  OPEN: "bg-primary/12 text-primary",
  AWAITING_SUPPORT: "bg-primary/12 text-primary",
  AWAITING_USER:
    "bg-[oklch(0.95_0.06_70)] text-[oklch(0.45_0.13_70)]",
  RESOLVED:
    "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]",
  CLOSED: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLES: Record<keyof typeof PRIORITY_LABELS, string> = {
  LOW: "text-muted-foreground",
  NORMAL: "text-muted-foreground",
  HIGH: "text-[oklch(0.55_0.16_60)] font-medium",
  URGENT: "text-destructive font-semibold",
};

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {tickets.map((t) => (
        <li
          key={t.id}
          className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
        >
          <Link
            href={`/dashboard/support/${t.id}`}
            className="flex items-center gap-4 px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[t.status]}`}
                >
                  {STATUS_LABELS[t.status]}
                </span>
                <span className="text-[10px] tracking-wide uppercase text-muted-foreground">
                  {CATEGORY_LABEL[t.category] ?? t.category}
                </span>
                {t.priority !== "NORMAL" && t.priority !== "LOW" && (
                  <span
                    className={`text-[10px] tracking-wide uppercase ${PRIORITY_STYLES[t.priority]}`}
                  >
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold tracking-tight">
                {t.subject}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  {t.createdByName ?? t.createdByEmail ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  {t.messageCount}
                </span>
                <span>
                  laatste:{" "}
                  {format(parseISO(t.lastMessageAt), "d MMM HH:mm", {
                    locale: nl,
                  })}
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

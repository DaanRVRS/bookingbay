"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Repeat, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import {
  deleteRecurringAction,
  toggleRecurringActiveAction,
} from "@/lib/recurring/actions";

type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

interface Template {
  id: string;
  itemName: string;
  customerName: string;
  customerEmail: string | null;
  frequency: Frequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startTimeMin: number;
  endTimeMin: number;
  nextRunAt: string;
  endsAt: string | null;
  isActive: boolean;
  notes: string | null;
}

const DAYS = ["Zon", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

function formatPattern(t: Template): string {
  const time = `${minutesToHHMM(t.startTimeMin)}–${minutesToHHMM(t.endTimeMin)}`;
  if (t.frequency === "MONTHLY") return `Maandelijks dag ${t.dayOfMonth}, ${time}`;
  const day = t.dayOfWeek !== null ? DAYS[t.dayOfWeek] : "?";
  const freq = t.frequency === "WEEKLY" ? "Wekelijks" : "Tweewekelijks";
  return `${freq} ${day}, ${time}`;
}

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function RecurringList({ templates }: { templates: Template[] }) {
  return (
    <ul className="grid gap-3">
      {templates.map((t) => (
        <Card key={t.id} template={t} />
      ))}
    </ul>
  );
}

function Card({ template }: { template: Template }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const r = await toggleRecurringActiveAction({
        id: template.id,
        isActive: !template.isActive,
      });
      if (r.ok) {
        toast.success(template.isActive ? "Gepauzeerd" : "Geactiveerd");
        router.refresh();
      } else {
        toast.error(r.error ?? "Bijwerken mislukt");
      }
    });
  };

  const onDelete = () => {
    if (!confirm("Reeks verwijderen? Al-gegenereerde boekingen blijven staan.")) return;
    startTransition(async () => {
      const r = await deleteRecurringAction(template.id);
      if (r.ok) {
        toast.success("Verwijderd");
        router.refresh();
      } else {
        toast.error(r.error ?? "Verwijderen mislukt");
      }
    });
  };

  const nextRun = new Date(template.nextRunAt);
  const endsAt = template.endsAt ? new Date(template.endsAt) : null;

  return (
    <li
      className={`rounded-xl border bg-card p-5 transition-opacity ${
        template.isActive ? "border-border" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Repeat className="size-4 text-primary" />
            <p className="text-base font-semibold tracking-tight">
              {template.itemName}
            </p>
            {!template.isActive && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                Gepauzeerd
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {template.customerName}
            {template.customerEmail ? ` · ${template.customerEmail}` : ""}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatPattern(template)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Volgende run:{" "}
            <strong className="text-foreground">
              {format(nextRun, "EEEE d MMM", { locale: nl })}
            </strong>
            {endsAt && (
              <>
                {" · loopt tot "}
                <strong className="text-foreground">
                  {format(endsAt, "d MMM yyyy", { locale: nl })}
                </strong>
              </>
            )}
          </p>
          {template.notes && (
            <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              "{template.notes}"
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-accent disabled:opacity-50"
            title={template.isActive ? "Pauzeren" : "Activeren"}
          >
            <Power className="size-3" />
            {template.isActive ? "Pauze" : "Hervat"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </li>
  );
}

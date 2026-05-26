"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createRecurringBookingAction } from "@/lib/recurring/actions";

type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

interface Item {
  id: string;
  name: string;
}
interface Customer {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  items: Item[];
  customers: Customer[];
}

const DAYS = [
  { v: 1, l: "Maandag" },
  { v: 2, l: "Dinsdag" },
  { v: 3, l: "Woensdag" },
  { v: 4, l: "Donderdag" },
  { v: 5, l: "Vrijdag" },
  { v: 6, l: "Zaterdag" },
  { v: 0, l: "Zondag" },
];

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function CreateRecurringDialog({ items, customers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    itemId: items[0]?.id ?? "",
    customerId: customers[0]?.id ?? "",
    frequency: "WEEKLY" as Frequency,
    dayOfWeek: "1",
    dayOfMonth: "1",
    startTime: "10:00",
    endTime: "11:00",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const r = await createRecurringBookingAction({
        itemId: form.itemId,
        customerId: form.customerId,
        frequency: form.frequency,
        dayOfWeek:
          form.frequency !== "MONTHLY" ? Number(form.dayOfWeek) : undefined,
        dayOfMonth:
          form.frequency === "MONTHLY" ? Number(form.dayOfMonth) : undefined,
        startTimeMin: timeToMinutes(form.startTime),
        endTimeMin: timeToMinutes(form.endTime),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        notes: form.notes,
      });
      if (r.ok) {
        toast.success("Reeks aangemaakt");
        setOpen(false);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error ?? "Aanmaken mislukt");
      }
    });
  };

  const noItems = items.length === 0;
  const noCustomers = customers.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noItems || noCustomers}
        title={
          noItems
            ? "Maak eerst een item aan"
            : noCustomers
              ? "Voeg eerst een klant toe"
              : undefined
        }
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="size-4" /> Nieuwe reeks
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <h2 className="text-base font-semibold">Nieuwe terugkerende boeking</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              De cron materialiseert iedere ~24u één toekomstige slot tegelijk
              (geen maandenlange backlog).
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Field label="Item" error={errors.itemId}>
                <select
                  value={form.itemId}
                  onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  required
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Klant" error={errors.customerId}>
                <select
                  value={form.customerId}
                  onChange={(e) =>
                    setForm({ ...form, customerId: e.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` — ${c.email}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Frequentie">
                <select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value as Frequency })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option value="WEEKLY">Wekelijks</option>
                  <option value="BIWEEKLY">Tweewekelijks</option>
                  <option value="MONTHLY">Maandelijks</option>
                </select>
              </Field>

              {form.frequency !== "MONTHLY" ? (
                <Field label="Dag van de week">
                  <select
                    value={form.dayOfWeek}
                    onChange={(e) =>
                      setForm({ ...form, dayOfWeek: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {DAYS.map((d) => (
                      <option key={d.v} value={d.v}>
                        {d.l}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Dag van de maand">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(e) =>
                      setForm({ ...form, dayOfMonth: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Starttijd">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    required
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </Field>
                <Field label="Eindtijd" error={errors.endTimeMin}>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    required
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Begint vanaf" error={errors.startDate}>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    required
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </Field>
                <Field label="Eindigt op (optioneel)">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </Field>
              </div>

              <Field label="Notitie (optioneel)">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-9 rounded-lg border border-border bg-card px-3 text-sm hover:bg-accent"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {pending && <Loader2 className="size-3 animate-spin" />}
                Aanmaken
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

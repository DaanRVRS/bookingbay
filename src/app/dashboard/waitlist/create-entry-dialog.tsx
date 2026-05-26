"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createWaitlistEntryAction } from "@/lib/waitlist/actions";

interface Item {
  id: string;
  name: string;
}

interface Props {
  items: Item[];
}

export function CreateEntryDialog({ items }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    itemId: items[0]?.id ?? "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    desiredStartAt: "",
    desiredEndAt: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const r = await createWaitlistEntryAction(form);
      if (r.ok) {
        toast.success("Op de wachtlijst gezet");
        setOpen(false);
        setForm({
          itemId: items[0]?.id ?? "",
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          desiredStartAt: "",
          desiredEndAt: "",
          notes: "",
        });
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error ?? "Aanmaken mislukt");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Plus className="size-4" /> Klant op wachtlijst
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
            <h2 className="text-base font-semibold">Op wachtlijst zetten</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Krijgt automatisch een mail zodra een conflicterende boeking
              wordt geannuleerd.
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
              <Field label="Naam" error={errors.customerName}>
                <input
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  required
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                />
              </Field>
              <Field label="E-mail" error={errors.customerEmail}>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) =>
                    setForm({ ...form, customerEmail: e.target.value })
                  }
                  required
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                />
              </Field>
              <Field label="Telefoon (optioneel)">
                <input
                  value={form.customerPhone}
                  onChange={(e) =>
                    setForm({ ...form, customerPhone: e.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gewenst van" error={errors.desiredStartAt}>
                  <input
                    type="datetime-local"
                    value={form.desiredStartAt}
                    onChange={(e) =>
                      setForm({ ...form, desiredStartAt: e.target.value })
                    }
                    required
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </Field>
                <Field label="Tot" error={errors.desiredEndAt}>
                  <input
                    type="datetime-local"
                    value={form.desiredEndAt}
                    onChange={(e) =>
                      setForm({ ...form, desiredEndAt: e.target.value })
                    }
                    required
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
                Toevoegen
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

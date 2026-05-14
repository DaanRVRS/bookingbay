"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  adminRemoveIntegrationAction,
  adminSetIntegrationStatusAction,
} from "@/lib/integrations/admin-actions";
import type { OrgIntegrationStatus } from "@prisma/client";

const STATUSES: { value: OrgIntegrationStatus; label: string }[] = [
  { value: "INTERESTED", label: "Interesse" },
  { value: "REQUESTED", label: "Aangevraagd" },
  { value: "ACTIVE", label: "Actief" },
  { value: "PAUSED", label: "Gepauzeerd" },
  { value: "FAILED", label: "Mislukt" },
];

export function AdminIntegrationControls({
  organizationId,
  slug,
  initialStatus,
  initialMonthlyPriceEuro,
}: {
  organizationId: string;
  slug: string;
  initialStatus: OrgIntegrationStatus;
  initialMonthlyPriceEuro: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<OrgIntegrationStatus>(initialStatus);
  const [price, setPrice] = useState(initialMonthlyPriceEuro);
  const [failureReason, setFailureReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    status !== initialStatus || price !== initialMonthlyPriceEuro;

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await adminSetIntegrationStatusAction({
        organizationId,
        slug,
        status,
        monthlyPriceEuro: price,
        failureReason: status === "FAILED" ? failureReason || undefined : undefined,
      });
      if (!res.ok) setErr(res.error ?? "Mislukt");
      else router.refresh();
    });
  }

  function remove() {
    if (!confirm("Record helemaal verwijderen?")) return;
    setErr(null);
    startTransition(async () => {
      const res = await adminRemoveIntegrationAction({ organizationId, slug });
      if (!res.ok) setErr(res.error ?? "Mislukt");
      else router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 lg:w-72">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrgIntegrationStatus)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[11px] text-muted-foreground">
            €
          </span>
          <input
            type="number"
            min={0}
            max={9999}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="h-9 w-full rounded-md border border-border bg-background pr-8 pl-5 text-xs tabular-nums outline-none focus:border-primary"
          />
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground">
            /m
          </span>
        </div>
      </div>

      {status === "FAILED" && (
        <input
          type="text"
          value={failureReason}
          onChange={(e) => setFailureReason(e.target.value)}
          placeholder="Reden (bv. 'Token verlopen')"
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={save}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {pending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
          Opslaan
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label="Record verwijderen"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {err && <p className="text-[11px] text-destructive">{err}</p>}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setOrgCrmStatusAction } from "@/lib/admin/crm/actions";

export function CrmStatusPicker({
  organizationId,
  current,
  statuses,
}: {
  organizationId: string;
  current: string;
  statuses: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (next === current) return;
        startTransition(async () => {
          const res = await setOrgCrmStatusAction(organizationId, next);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Status bijgewerkt");
          router.refresh();
        });
      }}
      className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { setOrgPlanAction } from "@/lib/admin/actions";

const PLAN_OPTIONS: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

export function OrgPlanForm({
  organizationId,
  currentPlan,
}: {
  organizationId: string;
  currentPlan: Plan;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(currentPlan);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan === currentPlan) return;
    startTransition(async () => {
      const res = await setOrgPlanAction(organizationId, plan);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Plan bijgewerkt");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">Wijzig plan</label>
      <div className="flex flex-wrap gap-2">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as Plan)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          {PLAN_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending || plan === currentPlan}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Toepassen
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { setOrgPlanAction } from "@/lib/admin/actions";

const PLAN_OPTIONS: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
type Mode = "keep" | "trial" | "paid";

export function OrgPlanForm({
  organizationId,
  currentPlan,
}: {
  organizationId: string;
  currentPlan: Plan;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(currentPlan);
  const [mode, setMode] = useState<Mode>("keep");
  const [days, setDays] = useState(30);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan === currentPlan && mode === "keep") return;
    startTransition(async () => {
      const res = await setOrgPlanAction(organizationId, plan, mode, days);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "trial"
          ? `Plan + trial (${days} dagen)`
          : mode === "paid"
            ? `Plan + betaald tot +${days} dagen`
            : "Plan bijgewerkt",
      );
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Plan</label>
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
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Type
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-border p-1">
          <ModeButton active={mode === "keep"} onClick={() => setMode("keep")}>
            Alleen plan
          </ModeButton>
          <ModeButton active={mode === "trial"} onClick={() => setMode("trial")}>
            Trial
          </ModeButton>
          <ModeButton active={mode === "paid"} onClick={() => setMode("paid")}>
            Direct betaald
          </ModeButton>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {mode === "keep"
            ? "Wijzigt alleen het plan. Trial/betaaldatum blijven zoals ze zijn."
            : mode === "trial"
              ? "Zet trialperiode op N dagen vooruit en wist eventueel betaaldatum + suspensie."
              : "Wist trial, zet betaald tot +N dagen en heft suspensie op."}
        </p>
      </div>

      {mode !== "keep" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            {mode === "trial" ? "Trial-duur" : "Betaalde periode"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={1830}
              value={days}
              onChange={(e) =>
                setDays(Math.max(1, Math.min(1830, Number(e.target.value) || 1)))
              }
              className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
            />
            <span className="text-xs text-muted-foreground">dagen</span>
          </div>
        </div>
      )}

      <div>
        <Button
          type="submit"
          disabled={pending || (plan === currentPlan && mode === "keep")}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Toepassen
        </Button>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-8 rounded-sm px-2 text-xs font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}

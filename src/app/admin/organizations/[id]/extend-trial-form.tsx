"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extendTrialAction } from "@/lib/admin/actions";

export function ExtendTrialForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await extendTrialAction(organizationId, days);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Trial +${days} dagen`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">Verleng trial</label>
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
        />
        <span className="self-center text-xs text-muted-foreground">dagen</span>
        <Button type="submit" disabled={pending} variant="outline">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Verleng
        </Button>
      </div>
    </form>
  );
}

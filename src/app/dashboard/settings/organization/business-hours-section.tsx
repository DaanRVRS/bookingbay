"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BusinessHoursEditor } from "@/components/dashboard/BusinessHoursEditor";
import { setOrgBusinessHoursAction } from "@/lib/business-hours/actions";
import type { BusinessHours } from "@/lib/business-hours/schemas";

interface Props {
  initial: BusinessHours | null;
  disabled?: boolean;
}

export function BusinessHoursSection({ initial, disabled = false }: Props) {
  const router = useRouter();
  const [hours, setHours] = useState<BusinessHours | null>(initial);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    startTransition(async () => {
      const res = await setOrgBusinessHoursAction(hours);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Openingstijden opgeslagen");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <BusinessHoursEditor
        value={hours}
        onChange={setHours}
        toggleLabel="Openingstijden actief"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={pending || disabled}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </div>
  );
}

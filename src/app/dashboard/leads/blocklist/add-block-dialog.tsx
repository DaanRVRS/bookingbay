"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { addLeadBlockAction } from "@/lib/leads/blocklist-actions";

interface FormValues {
  pattern: string;
  reason?: string;
}

export function AddBlockDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adres of domein toevoegen</DialogTitle>
          <DialogDescription>
            Geblokkeerde aanvragen verdwijnen stilletjes — de afzender ziet dezelfde bevestiging
            als bij een normale lead, maar er wordt niets in je inbox gezet.
          </DialogDescription>
        </DialogHeader>
        <BlockForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BlockForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    defaultValues: { pattern: "", reason: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await addLeadBlockAction({
        pattern: values.pattern,
        reason: values.reason,
      });
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof FormValues, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Toegevoegd aan blocklist");
      router.refresh();
      onDone();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="E-mailadres of domein"
        autoFocus
        placeholder="spammer@example.com  of  @example.com"
        hint="Begin met @ om een heel domein te blokkeren"
        error={errors.pattern?.message}
        {...register("pattern")}
      />
      <FormField
        label="Reden (optioneel)"
        placeholder="bv. Aanhoudend spam"
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Blokkeren
        </Button>
      </DialogFooter>
    </form>
  );
}

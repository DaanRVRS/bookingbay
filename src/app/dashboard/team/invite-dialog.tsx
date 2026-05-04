"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/auth/FormField";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { inviteSchema, type InviteInput } from "@/lib/team/schemas";
import { inviteMemberAction } from "@/lib/team/actions";
import type { z } from "zod";

type InviteFormValues = z.input<typeof inviteSchema>;

const ROLE_OPTIONS = ["ADMIN", "MANAGER", "VIEWER"] as const;

const ROLE_DESC: Record<(typeof ROLE_OPTIONS)[number], string> = {
  ADMIN: "Beheert team, catalogus en site-instellingen",
  MANAGER: "Maakt en beheert boekingen, ziet alle data",
  VIEWER: "Alleen lezen — handig voor stagiairs of accountants",
};

export function InviteDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lid uitnodigen</DialogTitle>
          <DialogDescription>
            We sturen een uitnodigingsmail. Wanneer ze accepteren krijgen ze direct toegang met de
            gekozen rol.
          </DialogDescription>
        </DialogHeader>
        <InviteForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<InviteFormValues, unknown, InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "VIEWER" },
  });

  const role = watch("role");

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await inviteMemberAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof InviteFormValues, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Uitnodiging verstuurd");
      router.refresh();
      onDone();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="E-mailadres"
        autoFocus
        type="email"
        placeholder="naam@bedrijf.nl"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="flex flex-col gap-1.5">
        <Label>Rol</Label>
        <Select
          items={ROLE_OPTIONS.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          value={role}
          onValueChange={(v) => v && setValue("role", v as typeof role)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {ROLE_DESC[role as keyof typeof ROLE_DESC] ?? ""}
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Verstuur uitnodiging
        </Button>
      </DialogFooter>
    </form>
  );
}

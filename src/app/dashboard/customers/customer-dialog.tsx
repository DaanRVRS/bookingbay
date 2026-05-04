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
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/auth/FormField";
import { customerCreateSchema, type CustomerCreateInput } from "@/lib/customers/schemas";
import { createCustomerAction, updateCustomerAction } from "@/lib/customers/actions";

interface Existing {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

interface Props {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  existing?: Existing;
  onCreated?: (customer: { id: string; name: string }) => void;
}

export function CustomerDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  existing,
  onCreated,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Klant bewerken" : "Nieuwe klant"}</DialogTitle>
          <DialogDescription>
            {existing
              ? "Wijzig de klantgegevens."
              : "Naam is verplicht. Andere velden mogen leeg blijven en kun je later aanvullen."}
          </DialogDescription>
        </DialogHeader>
        <CustomerForm existing={existing} onDone={() => setOpen(false)} onCreated={onCreated} />
      </DialogContent>
    </Dialog>
  );
}

function CustomerForm({
  existing,
  onDone,
  onCreated,
}: {
  existing?: Existing;
  onDone: () => void;
  onCreated?: (customer: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      name: existing?.name ?? "",
      email: existing?.email ?? "",
      phone: existing?.phone ?? "",
      notes: existing?.notes ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = existing
        ? await updateCustomerAction({ ...values, id: existing.id })
        : await createCustomerAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof CustomerCreateInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(existing ? "Bijgewerkt" : "Klant toegevoegd");
      router.refresh();
      onDone();
      if (!existing && res.ok && res.data && onCreated) onCreated(res.data);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="Naam"
        autoFocus
        placeholder="Voor- en achternaam"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="E-mail"
          type="email"
          placeholder="naam@voorbeeld.nl"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Telefoon"
          placeholder="06 12 34 56 78"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notities</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Interne aantekeningen — niet zichtbaar voor de klant"
          {...register("notes")}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {existing ? "Opslaan" : "Toevoegen"}
        </Button>
      </DialogFooter>
    </form>
  );
}

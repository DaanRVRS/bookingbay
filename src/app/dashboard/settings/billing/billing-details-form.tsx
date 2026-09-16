"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { updateBillingDetailsAction } from "@/lib/billing/billing-details-actions";
import {
  billingDetailsSchema,
  type BillingDetailsInput,
} from "@/lib/billing/billing-details-schema";

interface Props {
  initial: BillingDetailsInput;
  /** True zolang er nog geen gegevens zijn opgeslagen (prefill uit klantsite). */
  isPrefill: boolean;
  disabled?: boolean;
}

export function BillingDetailsForm({ initial, isPrefill, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<BillingDetailsInput>({
    resolver: zodResolver(billingDetailsSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateBillingDetailsAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof BillingDetailsInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Facturatiegegevens opgeslagen");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {isPrefill && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          Nog niet opgeslagen. We hebben de velden alvast ingevuld met wat we
          van je weten — controleer ze en klik op Opslaan; daarna kun je je
          abonnement starten.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Bedrijfsnaam (op de factuur)"
          autoComplete="organization"
          error={errors.companyName?.message}
          disabled={disabled}
          {...register("companyName")}
        />
        <FormField
          label="Factuur-e-mail (optioneel)"
          type="email"
          autoComplete="email"
          hint="Leeg = het e-mailadres van de eigenaar."
          error={errors.email?.message}
          disabled={disabled}
          {...register("email")}
        />
        <FormField
          label="Adres"
          autoComplete="street-address"
          placeholder="Straat en huisnummer"
          error={errors.address?.message}
          disabled={disabled}
          {...register("address")}
        />
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <FormField
            label="Postcode"
            autoComplete="postal-code"
            error={errors.postcode?.message}
            disabled={disabled}
            {...register("postcode")}
          />
          <FormField
            label="Plaats"
            autoComplete="address-level2"
            error={errors.city?.message}
            disabled={disabled}
            {...register("city")}
          />
        </div>
        <FormField
          label="Land (2 letters)"
          placeholder="NL"
          maxLength={2}
          error={errors.country?.message}
          disabled={disabled}
          {...register("country")}
        />
        <FormField
          label="Btw-nummer (optioneel)"
          placeholder="NL123456789B01"
          hint="Wordt op de factuur vermeld. Btw wordt altijd berekend (21%)."
          error={errors.vatNumber?.message}
          disabled={disabled}
          {...register("vatNumber")}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || disabled}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}

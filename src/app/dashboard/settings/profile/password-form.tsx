"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { changePasswordAction } from "@/lib/settings/actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/settings/schemas";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await changePasswordAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof ChangePasswordInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Wachtwoord bijgewerkt");
      reset();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="Huidig wachtwoord"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <FormField
        label="Nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        hint={errors.newPassword ? undefined : "Min. 8 tekens met hoofdletter, kleine letter, cijfer"}
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Wachtwoord wijzigen
        </Button>
      </div>
    </form>
  );
}

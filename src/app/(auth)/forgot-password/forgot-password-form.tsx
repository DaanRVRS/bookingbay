"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/auth/schemas";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await forgotPasswordAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSent(values.email);
    });
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Als <span className="text-foreground font-medium">{sent}</span> bekend is, is er nu een
          reset-link verstuurd. Check je inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        label="E-mailadres"
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="jij@bedrijf.nl"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Stuur reset-link
      </Button>
    </form>
  );
}

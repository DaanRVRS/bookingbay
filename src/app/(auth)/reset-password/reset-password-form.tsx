"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { resetPasswordAction } from "@/lib/auth/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/auth/schemas";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await resetPasswordAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof ResetPasswordInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    });
  });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Wachtwoord bijgewerkt. Je wordt doorgestuurd naar de login...
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium"
        >
          Direct inloggen
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <input type="hidden" {...register("token")} />
      <FormField
        label="Nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        autoFocus
        placeholder="Min. 8 tekens, hoofdletter, kleine letter, cijfer"
        hint={errors.password ? undefined : "Min. 8 tekens met hoofdletter, kleine letter en cijfer"}
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Wachtwoord opslaan
      </Button>
    </form>
  );
}

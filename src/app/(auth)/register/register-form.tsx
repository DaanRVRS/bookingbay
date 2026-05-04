"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { registerAction } from "@/lib/auth/actions";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: prefilledEmail, password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await registerAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof RegisterInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Account aangemaakt — check je inbox");
      router.push(`/check-email?email=${encodeURIComponent(values.email)}&context=verify`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        label="Je naam"
        autoComplete="name"
        autoFocus
        placeholder="Pieter de Jong"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormField
        label="E-mailadres"
        type="email"
        autoComplete="email"
        placeholder="jij@bedrijf.nl"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label="Wachtwoord"
        type="password"
        autoComplete="new-password"
        placeholder="Min. 8 tekens, hoofdletter, kleine letter, cijfer"
        hint={errors.password ? undefined : "Min. 8 tekens met hoofdletter, kleine letter en cijfer"}
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Account aanmaken
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Door te registreren ga je akkoord met onze{" "}
        <a href="/voorwaarden" className="text-foreground hover:underline">
          voorwaarden
        </a>{" "}
        en{" "}
        <a href="/privacy" className="text-foreground hover:underline">
          privacyverklaring
        </a>
        .
      </p>
    </form>
  );
}

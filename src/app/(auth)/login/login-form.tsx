"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { Separator } from "@/components/ui/separator";
import { loginAction, magicLinkAction } from "@/lib/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";

function safeNext(next: string | null | undefined): string {
  if (!next) return "/dashboard";
  // Only allow internal paths to prevent open-redirect
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [pending, startTransition] = useTransition();
  const [magicPending, setMagicPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await loginAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof LoginInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Welkom terug");
      router.replace(next);
      router.refresh();
    });
  });

  const onMagicLink = async () => {
    const email = getValues("email").trim();
    if (!email) {
      setError("email", { message: "Vul je e-mail in voor een magic link" });
      return;
    }
    setMagicPending(true);
    const res = await magicLinkAction({ email });
    setMagicPending(false);
    if (res.ok) {
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } else {
      toast.error(res.error);
    }
  };

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
      <div>
        <FormField
          label="Wachtwoord"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Wachtwoord vergeten?
          </Link>
        </div>
      </div>

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Inloggen
      </Button>

      <div className="relative my-2">
        <Separator />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[11px] tracking-wide text-muted-foreground uppercase">
          of
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={magicPending}
        onClick={onMagicLink}
      >
        {magicPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        Stuur me een magic link
      </Button>
    </form>
  );
}

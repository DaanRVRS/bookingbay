"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyTwoFactorAction } from "@/lib/twofa/actions";

function safeNext(next: string | null | undefined): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export function TwoFactorVerifyForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const target = safeNext(next);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await verifyTwoFactorAction(trimmed);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Ingelogd");
      router.replace(target);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          maxLength={20}
          placeholder="123456 of XXXX-XXXX"
          required
        />
        <p className="text-xs text-muted-foreground">
          6 cijfers uit je authenticator-app, of een backup-code (XXXX-XXXX).
        </p>
      </div>
      <Button type="submit" disabled={pending || !code.trim()} className="h-11 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Verifiëren
      </Button>
    </form>
  );
}

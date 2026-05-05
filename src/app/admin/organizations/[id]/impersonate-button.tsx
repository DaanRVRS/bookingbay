"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { startImpersonationAction } from "@/lib/admin/actions";

export function ImpersonateButton({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () => {
    if (
      !window.confirm(
        `Inloggen als ${userLabel}? Je ziet daarna hun dashboard en kunt acties uitvoeren namens deze gebruiker. Stop weer via de banner bovenaan.`,
      )
    ) {
      return;
    }
    start(async () => {
      const res = await startImpersonationAction(userId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <UserCog className="size-3" />
      )}
      Inloggen als
    </button>
  );
}

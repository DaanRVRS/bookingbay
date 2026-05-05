"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { adminVerifyEmailAction } from "@/lib/admin/actions";

export function VerifyEmailButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () => {
    start(async () => {
      const res = await adminVerifyEmailAction(userId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("E-mail geverifieerd");
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
        <MailCheck className="size-3" />
      )}
      Verifieer
    </button>
  );
}

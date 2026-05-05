"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { stopImpersonationAction } from "@/lib/admin/actions";

export function StopImpersonationButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () => {
    start(async () => {
      await stopImpersonationAction();
      router.push("/admin");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded bg-amber-950 px-2 py-1 text-[11px] font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <LogOut className="size-3" />
      )}
      Stop
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setUserAdminAction } from "@/lib/admin/actions";

export function AdminToggle({
  userId,
  isAdmin,
  isSelf,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground" title="Je kan jezelf niet wijzigen">
        — jij —
      </span>
    );
  }

  const onClick = () => {
    startTransition(async () => {
      const res = await setUserAdminAction(userId, !isAdmin);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isAdmin ? "Admin-rechten ingetrokken" : "Admin-rechten verleend");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors ${
        isAdmin
          ? "bg-primary/15 text-primary hover:bg-primary/25"
          : "bg-muted text-muted-foreground hover:bg-muted-foreground/15"
      }`}
    >
      {pending && <Loader2 className="size-3 animate-spin" />}
      {isAdmin ? "Admin" : "Promote"}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/team/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await acceptInviteAction({ token });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Welkom!");
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <Button onClick={onClick} disabled={pending} className="h-11 w-full">
      {pending && <Loader2 className="size-4 animate-spin" />}
      Accepteren
    </Button>
  );
}

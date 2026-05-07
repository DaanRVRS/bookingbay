"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/team/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      // On success the action redirects server-side to /dashboard and never
      // returns a result. We only see a return value on failure.
      const res = await acceptInviteAction({ token });
      if (res && !res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button onClick={onClick} disabled={pending} className="h-11 w-full">
      {pending && <Loader2 className="size-4 animate-spin" />}
      Accepteren
    </Button>
  );
}

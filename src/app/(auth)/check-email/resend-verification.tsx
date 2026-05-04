"use client";

import { useState } from "react";
import { toast } from "sonner";
import { resendVerificationAction } from "@/lib/auth/actions";

export function ResendVerification({ email }: { email: string }) {
  const [pending, setPending] = useState(false);

  if (!email) return <span>vraag opnieuw aan via login</span>;

  const onClick = async () => {
    setPending(true);
    const res = await resendVerificationAction(email);
    setPending(false);
    if (res.ok) toast.success("Nieuwe link verstuurd");
    else toast.error(res.error);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-foreground underline-offset-4 hover:underline disabled:opacity-50"
    >
      stuur opnieuw
    </button>
  );
}

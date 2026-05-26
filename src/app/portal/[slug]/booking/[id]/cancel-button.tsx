"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  slug: string;
  bookingId: string;
  token: string;
}

export function CancelButton({ slug, bookingId, token }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const onConfirm = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/portal/cancel-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, bookingId, token }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Boeking geannuleerd");
          router.refresh();
        } else {
          toast.error(data.error ?? "Annuleren mislukt");
          setConfirming(false);
        }
      } catch {
        toast.error("Annuleren mislukt — probeer 't opnieuw");
        setConfirming(false);
      }
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Weet je het zeker? Dit kan niet ongedaan gemaakt worden.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="text-xs text-muted-foreground hover:underline"
          >
            Toch niet
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending && <Loader2 className="size-3 animate-spin" />}
            Ja, annuleer
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-destructive hover:underline"
    >
      Annuleer mijn boeking
    </button>
  );
}

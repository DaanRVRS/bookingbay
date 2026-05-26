"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  slug: string;
  bookingId: string;
}

export function CancelButton({ slug, bookingId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const onConfirm = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/portal/cancel-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, bookingId }),
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="text-[11px] text-muted-foreground hover:underline"
        >
          Toch niet
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-destructive px-3 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3 animate-spin" />}
          Ja, annuleer
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-[11px] font-medium text-destructive hover:underline"
    >
      Annuleer boeking
    </button>
  );
}

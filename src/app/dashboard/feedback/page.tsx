import { MessageSquareHeart } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FeedbackForm } from "./feedback-form";

export const metadata = { title: "Feedback" };

interface PageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  await requireUser();
  const { source } = await searchParams;
  const trigger =
    source === "signup-prompt" ? "signup-prompt" : "voluntary";

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Vertel ons wat je vindt"
          description={
            trigger === "signup-prompt"
              ? "Je bent net begonnen — wat ging er soepel, wat haperde? Alles welkom."
              : "Bugs, ideeën, complimenten — we lezen alles."
          }
          back={{
            href:
              trigger === "signup-prompt" ? "/dashboard/notifications" : "/dashboard",
            label: "Terug",
          }}
        />
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <MessageSquareHeart className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Je feedback komt direct bij ons binnen. We reageren als er
            opvolging nodig is.
          </p>
        </div>
        <div className="mt-6">
          <FeedbackForm source={trigger} />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, MessageSquareHeart } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FeedbackForm } from "./feedback-form";

export const metadata = { title: "Feedback" };

interface PageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const { source } = await searchParams;
  const trigger =
    source === "signup-prompt" ? "signup-prompt" : "voluntary";

  const existing = await db.userFeedback.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

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

        {existing ? (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[oklch(0.7_0.13_150)]/40 bg-[oklch(0.7_0.13_150)]/5 p-6 text-center">
            <p className="flex items-center justify-center gap-2 text-base font-semibold text-[oklch(0.45_0.14_150)]">
              <CheckCircle2 className="size-5" />
              Bedankt — je feedback is ontvangen
            </p>
            <p className="text-sm text-muted-foreground">
              Je hebt op{" "}
              {format(existing.createdAt, "d MMMM yyyy", { locale: nl })} al
              feedback gegeven. Heb je nog iets toe te voegen?{" "}
              <Link
                href="/dashboard/support"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                Open een ticket
              </Link>
              , dan kunnen we 1-op-1 reageren.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <MessageSquareHeart className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                Je feedback komt direct bij ons binnen. We reageren als er
                opvolging nodig is.{" "}
                <strong className="text-foreground">
                  Je kan dit één keer doen
                </strong>{" "}
                — voor verdere vragen gebruik je{" "}
                <Link
                  href="/dashboard/support"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                >
                  support-tickets
                </Link>
                .
              </p>
            </div>
            <div className="mt-6">
              <FeedbackForm source={trigger} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

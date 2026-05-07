import { MessageSquareQuote, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { listReviewsForOrg } from "@/lib/reviews/queries";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ReviewsList } from "./reviews-list";
import { ReviewDialog } from "./review-dialog";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const ctx = await requireOrg();
  const reviews = await listReviewsForOrg(ctx.organization.id);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Reviews"
          description="Beheer hier je klant-reviews. Het Reviews-blok in de page-builder pakt ze automatisch."
          back={{ href: "/dashboard/site", label: "Terug naar klantsite" }}
          action={
            <ReviewDialog
              trigger={
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Plus className="size-4" /> Nieuwe review
                </button>
              }
            />
          }
        />

        {reviews.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MessageSquareQuote className="size-5" />
            </span>
            <h2 className="text-lg font-semibold">Nog geen reviews</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Voeg de eerste review toe — bijvoorbeeld een citaat van een
              tevreden klant. Je kan ze later in elke pagina tonen via het
              Reviews-blok.
            </p>
            <ReviewDialog
              trigger={
                <button className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Plus className="size-4" /> Eerste review
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-6">
            <ReviewsList reviews={reviews} />
          </div>
        )}
      </div>
    </div>
  );
}

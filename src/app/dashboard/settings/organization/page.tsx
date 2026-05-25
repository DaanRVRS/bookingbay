import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { OrgSettingsForm } from "./org-settings-form";
import { DangerZone } from "./danger-zone";
import { BusinessHoursSection } from "./business-hours-section";
import { PaymentSection } from "./payment-section";
import { ReviewRequestSection } from "./review-request-section";
import { can } from "@/lib/auth/permissions";
import { safeParseBusinessHours } from "@/lib/business-hours/schemas";
import { readPaymentConfig, maskKey } from "@/lib/payments/config";

export const metadata = { title: "Organisatie" };

export default async function OrgSettingsPage() {
  const ctx = await requireOrg();

  const org = await db.organization.findUnique({
    where: {
      id: ctx.organization.id,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      businessHours: true,
      reviewRequestEnabled: true,
      reviewRequestUrl: true,
      reviewRequestDelayDays: true,
    },
  });
  if (!org) throw new Error("Organization missing");
  const businessHours = safeParseBusinessHours(org.businessHours);
  const paymentConfig = await readPaymentConfig(org.id);

  const isOwner = can(ctx.membership.role, "org:manage");
  const isBilling = can(ctx.membership.role, "org:billing");

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Algemeen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Naam en slug worden gebruikt op je klantsite-URL en in transactionele e-mails.
        </p>
        <div className="mt-5">
          <OrgSettingsForm
            initial={{
              name: org.name,
              slug: org.slug,
              industry: org.industry ?? "",
            }}
            disabled={!isOwner}
          />
          {!isOwner && (
            <p className="mt-3 text-xs text-muted-foreground">
              Alleen Eigenaren mogen organisatie-instellingen wijzigen.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Openingstijden</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Standaard openingstijden voor de hele organisatie. Per item kun je
          dit overschrijven (bijv. een boot die alleen overdag mag varen).
          Uit gezet = altijd beschikbaar (geen tijdsbeperking).
        </p>
        <div className="mt-5">
          <BusinessHoursSection
            initial={businessHours}
            disabled={!isOwner}
          />
          {!isOwner && (
            <p className="mt-3 text-xs text-muted-foreground">
              Alleen Eigenaren mogen openingstijden wijzigen.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Betalen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hoe wil je dat klanten in de boekwidget afrekenen? &quot;Op locatie&quot; is
          de standaard — wil je online betalen, vul dan een Mollie- óf Stripe-key
          in (één van de twee tegelijk).
        </p>
        <div className="mt-5">
          <PaymentSection
            initial={{
              acceptLocation: paymentConfig.acceptLocation,
              onlineProvider: paymentConfig.onlineProvider,
              mollieKeyMasked: maskKey(paymentConfig.mollieKey),
              stripeKeyMasked: maskKey(paymentConfig.stripeKey),
              hasStripeWebhookSecret: Boolean(paymentConfig.stripeWebhookSecret),
            }}
            disabled={!isBilling}
          />
          {!isBilling && (
            <p className="mt-3 text-xs text-muted-foreground">
              Alleen rollen met facturatie-rechten kunnen betaalmethodes wijzigen.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Review-uitvraag</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Stuur klanten automatisch een mail met je review-link nadat hun
          boeking is voltooid. Google, Trustpilot, of je eigen pagina —
          alles kan.
        </p>
        <div className="mt-5">
          <ReviewRequestSection
            initial={{
              enabled: org.reviewRequestEnabled,
              url: org.reviewRequestUrl ?? "",
              delayDays: org.reviewRequestDelayDays,
            }}
            disabled={!isOwner}
          />
          {!isOwner && (
            <p className="mt-3 text-xs text-muted-foreground">
              Alleen Eigenaren mogen de review-uitvraag wijzigen.
            </p>
          )}
        </div>
      </section>

      {isOwner && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-base font-semibold text-destructive">Gevarenzone</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Definitief verwijderen van deze organisatie. Alle data — boekingen, klanten, items,
            leads — wordt onomkeerbaar gewist.
          </p>
          <div className="mt-4">
            <DangerZone orgName={org.name} />
          </div>
        </section>
      )}
    </div>
  );
}

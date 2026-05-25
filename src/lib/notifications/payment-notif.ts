import "server-only";
import { db } from "@/lib/db";
import { notifyOrgMembers } from "@/lib/notifications/send";

/**
 * Notif voor een Mollie/Stripe-webhook-transitie. Wordt aangeroepen vanuit
 * beide webhook-routes ZODRA er een echte paymentStatus-wijziging is
 * doorgevoerd op de boeking (= geen retry-spam).
 *
 * UNPAID krijgt geen notif — dat is de initial state na boeking-create
 * (waar al een aparte "Nieuwe boeking"-notif voor uitgaat).
 */
export async function notifyPaymentStatusChange(
  bookingId: string,
  paymentStatus: string,
  provider: "mollie" | "stripe",
): Promise<void> {
  if (paymentStatus === "UNPAID") return;

  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        organizationId: true,
        totalPrice: true,
        customer: { select: { name: true } },
        item: { select: { name: true } },
      },
    });
    if (!booking) return;

    const amount = `€${Number(booking.totalPrice).toFixed(2).replace(".", ",")}`;
    const who = booking.customer.name;
    const what = booking.item.name;
    const cta = `/dashboard/bookings/${bookingId}`;

    let title: string;
    let body: string;
    let type: string;

    switch (paymentStatus) {
      case "PAID":
        type = "booking.payment.paid";
        title = "Betaling ontvangen";
        body = `${who} betaalde ${amount} voor ${what} (via ${provider}).`;
        break;
      case "FAILED":
        type = "booking.payment.failed";
        title = "Betaling mislukt";
        body = `Betaling van ${who} (${amount}) voor ${what} is mislukt. Mogelijk neemt de klant opnieuw contact op.`;
        break;
      case "EXPIRED":
        type = "booking.payment.expired";
        title = "Betaling verlopen";
        body = `Betaal-link voor ${who} (${what}) is verlopen — de boeking is geannuleerd.`;
        break;
      case "REFUNDED":
        type = "booking.payment.refunded";
        title = "Betaling teruggestort";
        body = `${amount} teruggestort naar ${who} voor ${what}.`;
        break;
      default:
        return;
    }

    await notifyOrgMembers(booking.organizationId, {
      type,
      title,
      body,
      ctaUrl: cta,
      ctaLabel: "Bekijk boeking",
    });
  } catch (err) {
    console.error("[notifyPaymentStatusChange] mislukt:", err);
  }
}

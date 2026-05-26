import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Maakt een verse demo-tenant aan voor een prospect: User (isDemo) +
 * Organization (isDemo, trialEndsAt ver in de toekomst zodat de
 * subscription-banner niets verwijt) + memberships + seed-content
 * (2 categorieën, 4 items, 3 klanten, 5 bookings).
 *
 * Slug is gerandomiseerd zodat parallelle demo's elkaar niet bijten;
 * email idem zodat we de unique-constraint niet schenden.
 *
 * Belangrijke afwegingen voor de seed:
 *  - Geen Mollie/Stripe keys → online-payment-paden zijn uit voor demo's
 *  - Niet de echte e-mail van de prospect: dummy klanten + bookings,
 *    anders krijgt 'ie reminder-mails over verzonnen boekingen
 *  - Een paar bookings in het verleden (voltooid), één vandaag, paar
 *    in de toekomst — dashboard ziet er meteen bewoond uit
 */
export async function createDemoTenant(): Promise<{
  userId: string;
  organizationId: string;
  slug: string;
}> {
  const stamp = randomBytes(6).toString("hex");
  const email = `demo-${stamp}@bookingbay.demo`;
  const slug = `demo-${stamp}`;

  // 1 jaar trial → SubscriptionBanner valt niet over verlopen trial
  const trialEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const user = await db.user.create({
    data: {
      email,
      name: "Demo Eigenaar",
      emailVerified: new Date(), // skip verify-flow
      isDemo: true,
    },
    select: { id: true },
  });

  const org = await db.organization.create({
    data: {
      name: "Verhuur de Hoeve (demo)",
      slug,
      industry: "Botenverhuur",
      heroTitle: "Vaar de meren op",
      heroSubtitle: "Sloepen en zeilboten — direct online te boeken",
      contactEmail: "info@verhuur-de-hoeve.demo",
      contactPhone: "06 12 34 56 78",
      primaryColor: "#1e7a8a",
      widgetTagline: "Op het water binnen 5 minuten geboekt",
      widgetUsps: [
        { text: "Direct bevestigd", icon: "check" },
        { text: "Gratis annuleren tot 24u", icon: "clock" },
        { text: "Schippersbewijs niet vereist", icon: "shield" },
      ],
      trialEndsAt,
      isDemo: true,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
    select: { id: true, slug: true },
  });

  // ── Catalogus ────────────────────────────────────────────────────────
  const boten = await db.category.create({
    data: {
      organizationId: org.id,
      name: "Sloepen",
      description: "Comfortabele open boten — 4 tot 8 personen",
      sortOrder: 0,
    },
    select: { id: true },
  });
  const zeilboten = await db.category.create({
    data: {
      organizationId: org.id,
      name: "Zeilboten",
      description: "Voor ervaren zeilers",
      sortOrder: 1,
    },
    select: { id: true },
  });

  const itemsToCreate = [
    {
      name: "Sloep 'De Otter'",
      description: "6-persoons elektrische sloep met biminitop. Stil en comfortabel.",
      categoryId: boten.id,
      pricePerHour: 35,
      pricePerDay: 145,
      deposit: 100,
    },
    {
      name: "Sloep 'De Zwaan'",
      description: "4-persoons elektrische sloep — perfect voor een lunchvaart.",
      categoryId: boten.id,
      pricePerHour: 28,
      pricePerDay: 110,
      deposit: 75,
    },
    {
      name: "Polyvalk 16",
      description: "Klassieke open zeilboot voor twee. Inclusief zwemvesten.",
      categoryId: zeilboten.id,
      pricePerHour: null,
      pricePerDay: 95,
      deposit: 50,
    },
    {
      name: "Valk 20",
      description: "Grotere zeilboot voor maximaal 4 personen.",
      categoryId: zeilboten.id,
      pricePerHour: null,
      pricePerDay: 160,
      deposit: 100,
    },
  ];

  const items: { id: string }[] = [];
  for (const data of itemsToCreate) {
    const it = await db.item.create({
      data: {
        organizationId: org.id,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        pricePerHour: data.pricePerHour ?? undefined,
        pricePerDay: data.pricePerDay,
        deposit: data.deposit,
        quantity: 1,
        isActive: true,
      },
      select: { id: true },
    });
    items.push(it);
  }

  // ── Klanten ──────────────────────────────────────────────────────────
  const customersToCreate = [
    {
      name: "Lisa de Jong",
      email: "lisa.dejong@voorbeeld.demo",
      phone: "06 11 22 33 44",
    },
    {
      name: "Mark Visser",
      email: "mark.visser@voorbeeld.demo",
      phone: "06 22 33 44 55",
    },
    {
      name: "Familie Bakker",
      email: "p.bakker@voorbeeld.demo",
      phone: "06 33 44 55 66",
    },
  ];
  const customers: { id: string }[] = [];
  for (const data of customersToCreate) {
    const c = await db.customer.create({
      data: { organizationId: org.id, ...data },
      select: { id: true },
    });
    customers.push(c);
  }

  // ── Boekingen — mix van verleden + heden + toekomst ──────────────────
  const now = new Date();
  const daysAgo = (n: number, hour: number, end: number) => {
    const start = new Date(now);
    start.setDate(start.getDate() - n);
    start.setHours(hour, 0, 0, 0);
    const endAt = new Date(start);
    endAt.setHours(end, 0, 0, 0);
    return { start, endAt };
  };
  const daysFromNow = (n: number, hour: number, end: number) => {
    const start = new Date(now);
    start.setDate(start.getDate() + n);
    start.setHours(hour, 0, 0, 0);
    const endAt = new Date(start);
    endAt.setHours(end, 0, 0, 0);
    return { start, endAt };
  };

  const bookings = [
    // 2 voltooide boekingen vorige week
    {
      ...daysAgo(8, 10, 16),
      itemId: items[0].id,
      customerId: customers[0].id,
      status: "COMPLETED" as const,
      totalPrice: 145,
      completedAt: daysAgo(8, 16, 16).start,
    },
    {
      ...daysAgo(5, 11, 17),
      itemId: items[2].id,
      customerId: customers[1].id,
      status: "COMPLETED" as const,
      totalPrice: 95,
      completedAt: daysAgo(5, 17, 17).start,
    },
    // 1 bevestigd voor vandaag
    {
      ...daysFromNow(0, 13, 18),
      itemId: items[1].id,
      customerId: customers[2].id,
      status: "CONFIRMED" as const,
      totalPrice: 110,
    },
    // 2 toekomstig
    {
      ...daysFromNow(3, 9, 17),
      itemId: items[3].id,
      customerId: customers[0].id,
      status: "CONFIRMED" as const,
      totalPrice: 160,
    },
    {
      ...daysFromNow(7, 10, 14),
      itemId: items[0].id,
      customerId: customers[1].id,
      status: "PENDING" as const,
      totalPrice: 145,
    },
  ];

  for (const b of bookings) {
    await db.booking.create({
      data: {
        organizationId: org.id,
        itemId: b.itemId,
        customerId: b.customerId,
        startAt: b.start,
        endAt: b.endAt,
        status: b.status,
        totalPrice: b.totalPrice,
        completedAt: "completedAt" in b ? b.completedAt : null,
      },
    });
  }

  return { userId: user.id, organizationId: org.id, slug: org.slug };
}

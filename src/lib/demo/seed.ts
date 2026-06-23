import "server-only";
import { db } from "@/lib/db";

/**
 * Eén vaste, gedeelde demo-tenant. Idempotent: bestaat 'ie al (op de vaste
 * slug), dan geven we de bestaande demo-user terug; anders maken we 'm één
 * keer aan met realistische voorbeelddata.
 *
 * De demo is read-only voor bezoekers (zie lib/demo/guard.ts) — er is dus
 * maar ÉÉN demo-account in het systeem, geen wegwerp-tenants per bezoeker.
 * De demo-user is OWNER zodat de volledige UI getoond wordt; schrijfacties
 * worden door de demo-guard geblokkeerd.
 */

const DEMO_SLUG = "demo";
const DEMO_EMAIL = "demo@bookingbay.demo";

export async function ensureDemoUserId(): Promise<string> {
  // Bestaat de demo-tenant al? Pak de OWNER-membership-user.
  const existing = await db.organization.findUnique({
    where: { slug: DEMO_SLUG },
    select: {
      id: true,
      memberships: {
        where: { role: "OWNER" },
        select: { userId: true },
        take: 1,
      },
    },
  });
  if (existing && existing.memberships[0]) {
    return existing.memberships[0].userId;
  }

  // Nog niet aangemaakt → één keer seeden.
  const { userId } = await createDemoTenant();
  return userId;
}

async function createDemoTenant(): Promise<{ userId: string; organizationId: string }> {
  // 1 jaar trial → SubscriptionBanner valt niet over een verlopen trial.
  const trialEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Eigenaar",
      emailVerified: new Date(),
      isDemo: true,
    },
    select: { id: true },
  });

  const org = await db.organization.create({
    data: {
      name: "Verhuur de Hoeve (demo)",
      slug: DEMO_SLUG,
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
    select: { id: true },
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
      pricePerUnit: 145,
      bookingIntervalMinutes: 1440,
      deposit: 100,
      cleaningFee: 25,
    },
    {
      name: "Sloep 'De Zwaan'",
      description: "4-persoons elektrische sloep — perfect voor een lunchvaart.",
      categoryId: boten.id,
      pricePerUnit: 110,
      bookingIntervalMinutes: 1440,
      deposit: 75,
      cleaningFee: 20,
    },
    {
      name: "Polyvalk 16",
      description: "Klassieke open zeilboot voor twee. Inclusief zwemvesten.",
      categoryId: zeilboten.id,
      pricePerUnit: 95,
      bookingIntervalMinutes: 1440,
      deposit: 50,
      cleaningFee: null,
    },
    {
      name: "Valk 20",
      description: "Grotere zeilboot voor maximaal 4 personen.",
      categoryId: zeilboten.id,
      pricePerUnit: 160,
      bookingIntervalMinutes: 1440,
      deposit: 100,
      cleaningFee: null,
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
        pricePerUnit: data.pricePerUnit,
        bookingIntervalMinutes: data.bookingIntervalMinutes,
        deposit: data.deposit,
        cleaningFee: data.cleaningFee ?? undefined,
        quantity: 1,
        isActive: true,
      },
      select: { id: true },
    });
    items.push(it);
  }

  // ── Klanten ──────────────────────────────────────────────────────────
  const customersToCreate = [
    { name: "Lisa de Jong", email: "lisa.dejong@voorbeeld.demo", phone: "06 11 22 33 44" },
    { name: "Mark Visser", email: "mark.visser@voorbeeld.demo", phone: "06 22 33 44 55" },
    { name: "Familie Bakker", email: "p.bakker@voorbeeld.demo", phone: "06 33 44 55 66" },
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
  const at = (dayOffset: number, startHour: number, endHour: number) => {
    const start = new Date(now);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startHour, 0, 0, 0);
    const endAt = new Date(start);
    endAt.setHours(endHour, 0, 0, 0);
    return { start, endAt };
  };

  const bookings = [
    { ...at(-8, 10, 16), itemId: items[0].id, customerId: customers[0].id, status: "COMPLETED" as const, totalPrice: 145, completed: true },
    { ...at(-5, 11, 17), itemId: items[2].id, customerId: customers[1].id, status: "COMPLETED" as const, totalPrice: 95, completed: true },
    { ...at(0, 13, 18), itemId: items[1].id, customerId: customers[2].id, status: "CONFIRMED" as const, totalPrice: 110, completed: false },
    { ...at(3, 9, 17), itemId: items[3].id, customerId: customers[0].id, status: "CONFIRMED" as const, totalPrice: 160, completed: false },
    { ...at(7, 10, 14), itemId: items[0].id, customerId: customers[1].id, status: "PENDING" as const, totalPrice: 145, completed: false },
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
        completedAt: b.completed ? b.endAt : null,
      },
    });
  }

  return { userId: user.id, organizationId: org.id };
}

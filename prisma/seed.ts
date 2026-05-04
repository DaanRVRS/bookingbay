import { addDays, setHours, startOfDay } from "date-fns";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SEED_EMAIL = "demo@bookingbay.nl";
const SEED_PASSWORD = "Demo1234"; // for the demo account

async function main() {
  console.log("→ Seeding demo data…");

  const existing = await db.user.findUnique({ where: { email: SEED_EMAIL } });
  if (existing) {
    console.log(`  Demo user ${SEED_EMAIL} already exists. Skipping (re-run after deleting it).`);
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const user = await db.user.create({
    data: {
      email: SEED_EMAIL,
      name: "Demo Eigenaar",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const org = await db.organization.create({
    data: {
      name: "Aurora Bootverhuur",
      slug: "aurora",
      industry: "boats",
      heroTitle: "Vaar de Friese meren op",
      heroSubtitle: "Zeilboten, sloepen en tenders — ervaren of beginner.",
      contactEmail: "info@aurora-demo.nl",
      contactPhone: "06 12 34 56 78",
      plan: "PROFESSIONAL",
      trialEndsAt: addDays(new Date(), 14),
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  console.log(`  ✓ Created org "${org.name}" (slug: ${org.slug}) for ${SEED_EMAIL}`);

  // Categories
  const sail = await db.category.create({
    data: { organizationId: org.id, name: "Zeilboten", sortOrder: 0 },
  });
  const sloop = await db.category.create({
    data: { organizationId: org.id, name: "Sloepen", sortOrder: 1 },
  });
  const tender = await db.category.create({
    data: { organizationId: org.id, name: "Tenders", sortOrder: 2 },
  });

  // Items
  const items = await Promise.all([
    db.item.create({
      data: {
        organizationId: org.id,
        categoryId: sail.id,
        name: "Bavaria 32 — Aurora",
        description: "32-voet zeilboot, slaapt 4, perfect voor weekendtocht op het IJsselmeer.",
        pricePerHour: 35,
        pricePerDay: 240,
        pricePerWeek: 1450,
        deposit: 500,
        quantity: 1,
      },
    }),
    db.item.create({
      data: {
        organizationId: org.id,
        categoryId: sail.id,
        name: "Hanse 41 — Mistral",
        description: "Ruime 41-voet, slaapt 6, eigen zeilbewijs ABc verplicht.",
        pricePerDay: 320,
        pricePerWeek: 1900,
        deposit: 750,
        quantity: 1,
      },
    }),
    db.item.create({
      data: {
        organizationId: org.id,
        categoryId: sail.id,
        name: "Beneteau 28 — Solar",
        description: "Wendbare 28-voet voor dagtochten.",
        pricePerHour: 28,
        pricePerDay: 180,
        deposit: 300,
        quantity: 2,
      },
    }),
    db.item.create({
      data: {
        organizationId: org.id,
        categoryId: sloop.id,
        name: "Damarin sloep 600",
        description: "Klassieke sloep, max. 8 personen.",
        pricePerHour: 25,
        pricePerDay: 140,
        deposit: 250,
        quantity: 3,
      },
    }),
    db.item.create({
      data: {
        organizationId: org.id,
        categoryId: tender.id,
        name: "RIB 6.5 — Skipper",
        description: "Snelle RIB voor max. 8 pers., schipper inbegrepen.",
        pricePerHour: 75,
        pricePerDay: 480,
        deposit: 500,
        quantity: 1,
      },
    }),
    db.item.create({
      data: {
        organizationId: org.id,
        categoryId: tender.id,
        name: "Honda Tender — Daysail",
        description: "Compacte tender voor 4 personen.",
        pricePerHour: 35,
        pricePerDay: 220,
        deposit: 200,
        quantity: 2,
      },
    }),
  ]);

  // Customers
  const customers = await Promise.all([
    { name: "Sander de Jong", email: "sander@example.nl", phone: "06 12 11 11 11" },
    { name: "Lisa & Tom", email: "lisa.tom@example.nl", phone: "06 22 22 22 22" },
    { name: "Familie Kuiper", email: "kuiper@example.nl", phone: "06 33 33 33 33" },
    { name: "Bedrijf Van Dijk", email: "events@vandijk.nl", phone: "020 11 22 33" },
    { name: "Anna van Veen", email: "anna.vv@example.nl", phone: null },
  ].map((c) =>
    db.customer.create({
      data: {
        organizationId: org.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      },
    }),
  ));

  // Bookings spread over this and next week
  const today = startOfDay(new Date());
  const bookingPlan = [
    { itemIdx: 0, custIdx: 0, dayOffset: 0, startHour: 9, durationHours: 4, status: "CONFIRMED", price: 320 },
    { itemIdx: 1, custIdx: 1, dayOffset: 1, startHour: 10, durationHours: 7, status: "CONFIRMED", price: 380 },
    { itemIdx: 2, custIdx: 2, dayOffset: 2, startHour: 11, durationHours: 4, status: "CONFIRMED", price: 220 },
    { itemIdx: 3, custIdx: 3, dayOffset: 3, startHour: 9, durationHours: 8, status: "PENDING", price: 280 },
    { itemIdx: 4, custIdx: 4, dayOffset: 4, startHour: 13, durationHours: 5, status: "CONFIRMED", price: 600 },
    { itemIdx: 0, custIdx: 1, dayOffset: 7, startHour: 10, durationHours: 24 * 2, status: "CONFIRMED", price: 480 },
    { itemIdx: 5, custIdx: 0, dayOffset: 8, startHour: 12, durationHours: 6, status: "CONFIRMED", price: 280 },
    { itemIdx: 1, custIdx: 3, dayOffset: 9, startHour: 9, durationHours: 24 * 7, status: "CONFIRMED", price: 1900 },
    { itemIdx: 2, custIdx: 4, dayOffset: 10, startHour: 14, durationHours: 4, status: "PENDING", price: 200 },
    { itemIdx: 4, custIdx: 2, dayOffset: 12, startHour: 11, durationHours: 6, status: "CONFIRMED", price: 540 },
  ] as const;

  for (const b of bookingPlan) {
    const startAt = setHours(addDays(today, b.dayOffset), b.startHour);
    const endAt = new Date(startAt.getTime() + b.durationHours * 60 * 60 * 1000);
    await db.booking.create({
      data: {
        organizationId: org.id,
        itemId: items[b.itemIdx].id,
        customerId: customers[b.custIdx].id,
        startAt,
        endAt,
        status: b.status,
        totalPrice: b.price,
        createdById: user.id,
      },
    });
  }

  console.log(`  ✓ ${items.length} items · ${customers.length} klanten · ${bookingPlan.length} boekingen`);
  console.log("");
  console.log("Demo login:");
  console.log(`  email:    ${SEED_EMAIL}`);
  console.log(`  password: ${SEED_PASSWORD}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

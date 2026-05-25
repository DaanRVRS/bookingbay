-- Dashboard-overview deed een `findMany` over alle bookings van de
-- afgelopen 365 dagen per org. Zonder een (orgId, createdAt)-index
-- werd dat een sequential scan over de hele Booking-tabel. Met deze
-- index is het een range-scan binnen één tenant.
CREATE INDEX IF NOT EXISTS "Booking_organizationId_createdAt_idx"
  ON "Booking"("organizationId", "createdAt");

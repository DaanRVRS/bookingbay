-- CalendarBlock: uniekheid org-gescoped maken. Twee tenants kunnen hetzelfde
-- Google-event (event.id) delen; met de oude globale unique (source,
-- externalId) overschreef tenant B's sync de rij van tenant A. De nieuwe key
-- is strikt losser, dus bestaande rijen blijven geldig — geen data-cleanup.

DROP INDEX IF EXISTS "CalendarBlock_source_externalId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarBlock_organizationId_source_externalId_key"
  ON "CalendarBlock" ("organizationId", "source", "externalId");

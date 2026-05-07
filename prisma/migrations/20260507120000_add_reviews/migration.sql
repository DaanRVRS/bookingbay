-- Reviews / testimonials managed centrally per organization.
CREATE TABLE "Review" (
  "id"             TEXT        PRIMARY KEY,
  "organizationId" TEXT        NOT NULL,
  "quote"          TEXT        NOT NULL,
  "author"         TEXT        NOT NULL,
  "role"           TEXT,
  "rating"         INTEGER     NOT NULL DEFAULT 5,
  "isPublished"    BOOLEAN     NOT NULL DEFAULT true,
  "sortOrder"      INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Review_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Review_organizationId_isPublished_sortOrder_idx"
  ON "Review"("organizationId", "isPublished", "sortOrder");

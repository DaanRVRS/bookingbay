-- Zelf wisselen van plan: downgrades gaan pas in bij de volgende verlenging.
-- pendingPlan houdt de geplande wissel vast; de Mollie-webhook past 'm toe.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "pendingPlan" "Plan";

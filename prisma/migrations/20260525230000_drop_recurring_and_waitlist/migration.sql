-- Feature teruggedraaid (revert 2b6d933). Tabellen + enums droppen
-- zodat ze niet ongebruikt in productie blijven hangen.
DROP TABLE IF EXISTS "WaitlistEntry";
DROP TABLE IF EXISTS "RecurringBooking";
DROP TYPE IF EXISTS "WaitlistStatus";
DROP TYPE IF EXISTS "RecurringFrequency";

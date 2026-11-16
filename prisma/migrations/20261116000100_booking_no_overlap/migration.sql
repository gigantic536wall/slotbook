-- Database-level guarantees that do not depend on application code.

-- btree_gist lets an exclusion constraint combine "=" on staffId with "&&" on time ranges.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A staff member can never have two overlapping confirmed bookings,
-- even if two customers press "Book" at the same moment.
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_range" CHECK ("endsAt" > "startsAt");
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_valid_range" CHECK ("endsAt" > "startsAt");

ALTER TABLE "WorkingHours"
  ADD CONSTRAINT "WorkingHours_valid" CHECK (
    "weekday" BETWEEN 0 AND 6 AND "startMin" >= 0 AND "endMin" <= 1440 AND "endMin" > "startMin"
  );

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_valid" CHECK ("durationMin" > 0 AND "priceCents" >= 0);

-- Store the price at booking time. Existing bookings get the current service price.
ALTER TABLE "Booking" ADD COLUMN "priceCents" INTEGER;

UPDATE "Booking" b
SET "priceCents" = s."priceCents"
FROM "Service" s
WHERE s.id = b."serviceId";

ALTER TABLE "Booking" ALTER COLUMN "priceCents" SET NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_price_valid" CHECK ("priceCents" >= 0);

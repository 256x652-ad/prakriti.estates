-- =========================================================================
-- MIGRATION: 20261011_stay_reservation_exclusion_constraint.sql
-- PURPOSE: Physically enforce zero double-bookings at the PostgreSQL engine level
--          using btree_gist and exclusion constraints over daterange.
-- =========================================================================

-- 1. Ensure the btree_gist extension is enabled (required to mix UUID/text with daterange in GiST)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Drop existing constraint if already present to guarantee idempotency
ALTER TABLE "StayReservation" 
DROP CONSTRAINT IF EXISTS no_overlapping_confirmed_stay_reservations;

-- 3. Add PostgreSQL Exclusion Constraint:
-- Physically rejects any insert/update where propertyId is identical
-- AND the daterange(checkInDate, checkOutDate, '[)') overlaps WITH any existing reservation
-- that is in 'CONFIRMED' or 'PAYMENT_PENDING' status.
ALTER TABLE "StayReservation"
ADD CONSTRAINT no_overlapping_confirmed_stay_reservations
EXCLUDE USING gist (
  "propertyId" WITH =,
  daterange("checkInDate"::date, "checkOutDate"::date, '[)') WITH &&
)
WHERE ("status" IN ('CONFIRMED', 'PAYMENT_PENDING'));

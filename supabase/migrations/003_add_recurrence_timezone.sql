-- Migration 003: Add recurrence and timezone fields to schedules table
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS recurrence_rule  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_end   DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS timezone         TEXT DEFAULT NULL;

COMMENT ON COLUMN schedules.recurrence_rule IS 'RFC 5545 RRULE string, e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR';
COMMENT ON COLUMN schedules.recurrence_end  IS 'Date after which recurrence stops (inclusive)';
COMMENT ON COLUMN schedules.timezone        IS 'IANA timezone string, e.g. Asia/Manila';

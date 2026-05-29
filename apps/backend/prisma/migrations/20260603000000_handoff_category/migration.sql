-- Handoff classification — lets the dashboard sort handed-off chats into a
-- Complaints section and show why each one needs attention.

CREATE TYPE "HandoffCategory" AS ENUM (
  'complaint',
  'refund',
  'payment_dispute',
  'low_confidence',
  'asked_for_human',
  'other'
);

ALTER TABLE "conversations"
  ADD COLUMN "handoff_category" "HandoffCategory",
  ADD COLUMN "handoff_reason" TEXT;

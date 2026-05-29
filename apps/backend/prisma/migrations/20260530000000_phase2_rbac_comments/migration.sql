-- Phase 2 migration — adds RBAC (auth + invites + audit) and rounds out
-- comment automation columns.

-- ── User credentials (auth) ─────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- ── Invites ─────────────────────────────────────────────────────────────────
CREATE TABLE "invites" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "invited_by_id" TEXT NOT NULL REFERENCES "users"("id"),
  "accepted_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "invites" ("organization_id");
CREATE INDEX ON "invites" ("email");

-- ── Audit events ─────────────────────────────────────────────────────────────
CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "actor_user_id" TEXT REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "audit_events" ("organization_id", "created_at");

-- ── Comment automation columns + rules table ────────────────────────────────
CREATE TYPE "CommentReplyMode" AS ENUM ('ai', 'manual', 'off');

ALTER TABLE "comments"
  ADD COLUMN "commenter_name" TEXT,
  ADD COLUMN "intent_confidence" DOUBLE PRECISION,
  ADD COLUMN "public_reply_text" TEXT,
  ADD COLUMN "public_reply_at" TIMESTAMP(3),
  ADD COLUMN "private_reply_sent" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "comments_organization_id_created_at_idx"
  ON "comments" ("organization_id", "created_at");
CREATE INDEX "comments_page_id_post_id_idx"
  ON "comments" ("page_id", "post_id");

CREATE TABLE "comment_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "intent" "CommentIntent" NOT NULL,
  "reply_mode" "CommentReplyMode" NOT NULL DEFAULT 'ai',
  "public_template" TEXT,
  "private_allowed" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organization_id", "intent")
);

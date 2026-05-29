-- Tags — reusable per-org labels applied to conversations (CRM-style chips).

-- ── Tags ─────────────────────────────────────────────────────────────────────
CREATE TABLE "tags" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'slate',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "tags_organization_id_name_key" ON "tags" ("organization_id", "name");
CREATE INDEX "tags_organization_id_idx" ON "tags" ("organization_id");

-- ── Conversation ↔ Tag join ──────────────────────────────────────────────────
CREATE TABLE "conversation_tags" (
  "conversation_id" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "tag_id" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_tags_pkey" PRIMARY KEY ("conversation_id", "tag_id")
);
CREATE INDEX "conversation_tags_tag_id_idx" ON "conversation_tags" ("tag_id");

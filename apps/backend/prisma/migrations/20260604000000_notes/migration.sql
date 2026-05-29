-- Internal merchant notes on a conversation (never shown to the customer).

CREATE TABLE "notes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "conversation_id" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "author_user_id" TEXT REFERENCES "users"("id"),
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notes_conversation_id_created_at_idx" ON "notes" ("conversation_id", "created_at");

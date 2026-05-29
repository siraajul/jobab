-- Jobab Phase 1 — initial migration.
-- pgvector extension first; everything else follows the Prisma schema.

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE "OrgStatus" AS ENUM ('onboarding', 'active', 'paused');
CREATE TYPE "CatalogSource" AS ENUM ('shopify', 'woocommerce', 'csv');
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'agent');
CREATE TYPE "Platform" AS ENUM ('facebook', 'instagram', 'whatsapp');
CREATE TYPE "PageStatus" AS ENUM ('connected', 'error', 'disconnected');
CREATE TYPE "Direction" AS ENUM ('in', 'out');
CREATE TYPE "Sender" AS ENUM ('customer', 'agent', 'human');
CREATE TYPE "ConversationStatus" AS ENUM ('bot', 'needs_human', 'human', 'closed');
CREATE TYPE "OrderStatus" AS ENUM ('created', 'confirmed', 'cancelled');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE "CommentIntent" AS ENUM ('price', 'buy', 'question', 'other', 'spam');
CREATE TYPE "DevicePlatform" AS ENUM ('ios', 'android');

-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE "organizations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "catalog_source" "CatalogSource",
  "catalog_credentials" JSONB,
  "ai_instructions" TEXT,
  "status" "OrgStatus" NOT NULL DEFAULT 'onboarding',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "memberships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "role" "MemberRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("user_id", "organization_id")
);
CREATE INDEX ON "memberships" ("organization_id");

CREATE TABLE "pages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "platform" "Platform" NOT NULL,
  "external_page_id" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "webhook_subscribed" BOOLEAN NOT NULL DEFAULT false,
  "status" "PageStatus" NOT NULL DEFAULT 'connected',
  UNIQUE ("platform", "external_page_id")
);
CREATE INDEX ON "pages" ("organization_id");

CREATE TABLE "products" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "external_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "image_url" TEXT,
  "text_embedding" vector,
  "image_embedding" vector,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organization_id", "external_id")
);
CREATE INDEX ON "products" ("organization_id");

CREATE TABLE "product_variants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "product_id" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "stock_qty" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "product_variants" ("product_id");

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" TEXT NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "external_user_id" TEXT NOT NULL,
  "assigned_user_id" TEXT REFERENCES "users"("id"),
  "customer_name" TEXT,
  "customer_phone" TEXT,
  "customer_address" TEXT,
  "status" "ConversationStatus" NOT NULL DEFAULT 'bot',
  "last_customer_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("page_id", "external_user_id")
);
CREATE INDEX ON "conversations" ("organization_id");
CREATE INDEX ON "conversations" ("status");

CREATE TABLE "messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversation_id" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "direction" "Direction" NOT NULL,
  "sender" "Sender" NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" JSONB,
  "raw" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "messages" ("conversation_id", "created_at");

CREATE TABLE "comments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "page_id" TEXT NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "external_comment_id" TEXT NOT NULL UNIQUE,
  "post_id" TEXT NOT NULL,
  "commenter_external_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "intent" "CommentIntent",
  "public_reply_sent" BOOLEAN NOT NULL DEFAULT false,
  "private_reply_conversation_id" TEXT REFERENCES "conversations"("id"),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "comments" ("organization_id");
CREATE INDEX ON "comments" ("page_id");

CREATE TABLE "orders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "conversation_id" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "external_order_id" TEXT,
  "items" JSONB NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL,
  "customer_address" TEXT NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "payment_link" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'created',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "orders" ("organization_id", "status");
CREATE INDEX ON "orders" ("conversation_id");

CREATE TABLE "agent_runs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversation_id" TEXT NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "message_id" TEXT REFERENCES "messages"("id"),
  "model" TEXT NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
  "tool_calls" JSONB,
  "latency_ms" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "agent_runs" ("conversation_id", "created_at");

CREATE TABLE "device_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform" "DevicePlatform" NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

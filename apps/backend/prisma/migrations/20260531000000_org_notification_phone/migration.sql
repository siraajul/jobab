-- WhatsApp notification phone per org (E.164 format expected)
ALTER TABLE "organizations" ADD COLUMN "notification_phone" TEXT;

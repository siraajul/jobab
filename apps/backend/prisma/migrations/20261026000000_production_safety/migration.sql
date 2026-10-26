-- Additive expansion: existing users, messages and orders remain readable.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN automation_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN external_message_id TEXT, ADD COLUMN reply_to_message_id TEXT,
 ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'received', ADD COLUMN external_delivery_id TEXT,
 ADD COLUMN delivery_error TEXT;
CREATE UNIQUE INDEX messages_external_message_id_key ON messages(external_message_id);
CREATE UNIQUE INDEX messages_reply_to_message_id_key ON messages(reply_to_message_id);
ALTER TABLE orders ADD COLUMN payment_id TEXT, ADD COLUMN payment_transaction_id TEXT;
CREATE UNIQUE INDEX orders_payment_id_key ON orders(payment_id);
CREATE UNIQUE INDEX orders_payment_transaction_id_key ON orders(payment_transaction_id);
CREATE TABLE password_reset_tokens (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMP(3) NOT NULL, used_at TIMESTAMP(3)
);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

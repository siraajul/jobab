ALTER TABLE pages ADD COLUMN connected_facebook_user_id TEXT;
CREATE INDEX pages_connected_facebook_user_id_idx ON pages(connected_facebook_user_id);

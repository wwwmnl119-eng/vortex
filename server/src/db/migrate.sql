-- Run this to update existing database
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_channel BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Set Vortex as admin
UPDATE users SET is_admin = true, is_verified = true WHERE username = 'Vortex';

-- Make username unique for chats (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chats_username_key') THEN
    ALTER TABLE chats ADD CONSTRAINT chats_username_key UNIQUE (username);
  END IF;
END $$;

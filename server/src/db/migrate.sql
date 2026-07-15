-- Safe migration - adds columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_channel BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Set Vortex as admin
UPDATE users SET is_admin = true, is_verified = true WHERE username = 'Vortex';

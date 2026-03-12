-- Add login identifier support for driver's license or username signup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_type TEXT;  -- 'dl' | 'username' | 'email'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_id TEXT;  -- raw value for display (DL number or username)

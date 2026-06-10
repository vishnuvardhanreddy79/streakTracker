-- Standalone database update script. Run this in your Supabase SQL Editor.
-- WARNING: This drops the existing profiles and activities tables to recreate them.
-- All existing local entries on Supabase will be cleared.

DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Recreate Profiles table linked to auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(512),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Recreate Activities table with image_url column
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    notes TEXT,
    image_url TEXT, -- Path to JPG submission in storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE (user_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Enable public select/insert/update policies
CREATE POLICY "Allow public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert activities" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update activities" ON activities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete activities" ON activities FOR DELETE USING (true);

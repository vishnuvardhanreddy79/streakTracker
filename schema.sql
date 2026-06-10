-- SQL schema for Educational Progress Tracker with Authentication and Submissions

-- Profiles table - linked directly to Supabase Auth users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(512),
    is_admin BOOLEAN DEFAULT FALSE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    streak_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    last_active_date DATE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Activities table - stores study logs and JPG work uploads
CREATE TABLE IF NOT EXISTS activities (
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

-- Notifications table - stores messages and notifications sent to trainees
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    from_admin BOOLEAN DEFAULT TRUE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies (allow read and write access for authenticated actions)
CREATE POLICY "Allow public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert activities" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update activities" ON activities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete activities" ON activities FOR DELETE USING (true);

CREATE POLICY "Allow public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notifications" ON notifications FOR DELETE USING (true);

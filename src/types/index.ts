export interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  current_streak?: number;
  longest_streak?: number;
  streak_frozen?: boolean;
  last_active_date?: string | null;
  streak_freezes?: number;
}

export interface Activity {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  count: number;
  category: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isFrozen?: boolean;
}

export interface StreakFreezeUsage {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface UserProgress {
  profile: Profile;
  activities: Activity[];
  streak: Streak;
  freezeDates?: string[];
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

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
  points?: number;
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

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string; // 'A', 'B', 'C', 'D'
  reward_type: string; // 'points', 'freeze'
  reward_amount: number;
  created_at: string;
}

export interface QuizSubmission {
  id: string;
  user_id: string;
  quiz_id: string;
  selected_option: string;
  is_correct: boolean;
  reward_earned: string | null;
  created_at: string;
}


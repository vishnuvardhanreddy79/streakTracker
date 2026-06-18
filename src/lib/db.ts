import { createClient } from '@supabase/supabase-js';
import { Profile, Activity, Streak, UserProgress, Notification, StreakFreezeUsage, Quiz, QuizSubmission } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// ─── Simple In-Memory Cache with TTL ────────────────────────────────────────
const cache: Record<string, { data: unknown; expiry: number }> = {};
const CACHE_TTL = 5000; // 5 seconds

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  delete cache[key];
  return null;
}

function setCache(key: string, data: unknown): void {
  cache[key] = { data, expiry: Date.now() + CACHE_TTL };
}

export function invalidateCache(prefix?: string): void {
  if (prefix) {
    Object.keys(cache).forEach(key => {
      if (key.startsWith(prefix)) delete cache[key];
    });
  } else {
    Object.keys(cache).forEach(key => delete cache[key]);
  }
}

// ─── Helper: Format Date to YYYY-MM-DD in local time ────────────────────────
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Parse YYYY-MM-DD string to local Date object (prevents timezone shifts)
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ─── Dynamic Streak Calculator ──────────────────────────────────────────────
export function calculateStreak(activities: Activity[], freezeDates: string[] = []): Streak {
  if (activities.length === 0 && freezeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  // Extract and sort unique dates (YYYY-MM-DD) descending
  const activeDates = Array.from(new Set([
    ...activities.map(a => a.date),
    ...freezeDates
  ])).sort(
    (a, b) => parseLocalDate(b).getTime() - parseLocalDate(a).getTime()
  );

  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  let currentStreak = 0;
  const latestActiveDate = activeDates[0];

  // If the last active date is today or yesterday, check current streak
  if (latestActiveDate === todayStr || latestActiveDate === yesterdayStr) {
    currentStreak = 1;
    const expectedDate = parseLocalDate(latestActiveDate);

    for (let i = 1; i < activeDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedDateStr = getLocalDateString(expectedDate);

      if (activeDates[i] === expectedDateStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  const sortedDatesAsc = [...activeDates].reverse();
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const dateStr of sortedDatesAsc) {
    const currentDate = parseLocalDate(dateStr);
    if (!previousDate) {
      runningStreak = 1;
    } else {
      const diffTime = Math.abs(currentDate.getTime() - previousDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
        runningStreak = 1;
      }
    }
    previousDate = currentDate;
  }

  if (runningStreak > longestStreak) {
    longestStreak = runningStreak;
  }

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: latestActiveDate || null,
  };
}

// ─── LocalStorage Helpers (Clean — No Seed Data) ────────────────────────────
function getLocalStorageData(): { 
  profiles: Profile[]; 
  activities: Activity[]; 
  notifications: Notification[];
  streak_freeze_usages: StreakFreezeUsage[];
} {
  if (typeof window === 'undefined') {
    return { profiles: [], activities: [], notifications: [], streak_freeze_usages: [] };
  }

  const p = localStorage.getItem('tracker_profiles');
  const a = localStorage.getItem('tracker_activities');
  const n = localStorage.getItem('tracker_notifications');
  const f = localStorage.getItem('tracker_streak_freeze_usages');

  if (!p) {
    localStorage.setItem('tracker_profiles', JSON.stringify([]));
  }
  if (!a) {
    localStorage.setItem('tracker_activities', JSON.stringify([]));
  }
  if (!n) {
    localStorage.setItem('tracker_notifications', JSON.stringify([]));
  }
  if (!f) {
    localStorage.setItem('tracker_streak_freeze_usages', JSON.stringify([]));
  }

  return {
    profiles: p ? JSON.parse(p) : [],
    activities: a ? JSON.parse(a) : [],
    notifications: n ? JSON.parse(n) : [],
    streak_freeze_usages: f ? JSON.parse(f) : [],
  };
}

function saveLocalStorageData(
  profiles: Profile[],
  activities: Activity[],
  notifications?: Notification[],
  streak_freeze_usages?: StreakFreezeUsage[]
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tracker_profiles', JSON.stringify(profiles));
  localStorage.setItem('tracker_activities', JSON.stringify(activities));
  if (notifications !== undefined) {
    localStorage.setItem('tracker_notifications', JSON.stringify(notifications));
  }
  if (streak_freeze_usages !== undefined) {
    localStorage.setItem('tracker_streak_freeze_usages', JSON.stringify(streak_freeze_usages));
  }
}

// ─── Auth & Session Helpers ─────────────────────────────────────────────────

export async function checkSupabaseStatus(): Promise<boolean> {
  return isSupabaseConfigured;
}

export async function getSessionProfile(): Promise<Profile | null> {
  if (typeof window === 'undefined') return null;

  if (isSupabaseConfigured && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profile) return profile;
    }
  }

  // Mock Session fallback
  const saved = localStorage.getItem('tracker_session');
  if (saved) {
    try {
      const sessionUser = JSON.parse(saved) as Profile;
      // Refresh mock profile from database
      const local = getLocalStorageData();
      const refUser = local.profiles.find(p => p.id === sessionUser.id);
      return refUser || sessionUser;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Require a valid session or return null.
 * Use this to guard data operations against unauthenticated access.
 */
export async function requireSession(): Promise<Profile | null> {
  const profile = await getSessionProfile();
  return profile || null;
}

export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tracker_session');
  }
  invalidateCache();
}

// ─── Data Service Methods ───────────────────────────────────────────────────

export async function getProfiles(): Promise<Profile[]> {
  const cached = getCached<Profile[]>('profiles');
  if (cached) return cached;

  let profiles: Profile[] = [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching Supabase profiles, using fallback:', error);
      profiles = getLocalStorageData().profiles;
    } else {
      profiles = data || [];
    }
  } else {
    profiles = getLocalStorageData().profiles;
  }

  // Display-time decay check
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const processed = profiles.map(profile => {
    const isBroken = !profile.streak_frozen &&
                     profile.last_active_date !== todayStr &&
                     profile.last_active_date !== yesterdayStr;
    return {
      ...profile,
      current_streak: isBroken ? 0 : (profile.current_streak ?? 0)
    };
  });

  setCache('profiles', processed);
  return processed;
}

export async function getUserProgress(profileId: string): Promise<UserProgress | null> {
  const cacheKey = `progress_${profileId}`;
  const cached = getCached<UserProgress>(cacheKey);
  if (cached) return cached;

  let profile: Profile | null = null;
  let activities: Activity[] = [];
  let freezeDates: string[] = [];

  if (isSupabaseConfigured && supabase) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError) {
      console.error('Error fetching profile from Supabase:', profileError);
    } else {
      profile = profileData;
    }

    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', profileId)
      .order('date', { ascending: false });

    if (activityError) {
      console.error('Error fetching activities from Supabase:', activityError);
    } else {
      activities = activityData || [];
    }

    const { data: freezeData, error: freezeError } = await supabase
      .from('streak_freeze_usages')
      .select('date')
      .eq('user_id', profileId);

    if (freezeError) {
      console.error('Error fetching freeze usages from Supabase:', freezeError);
    } else {
      freezeDates = (freezeData || []).map(f => f.date);
    }
  }

  if (!profile) {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === profileId) || null;
    activities = local.activities
      .filter(a => a.user_id === profileId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    freezeDates = local.streak_freeze_usages
      .filter(f => f.user_id === profileId)
      .map(f => f.date);
  }

  if (!profile) return null;

  // Display-time decay check
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const isBroken = !profile.streak_frozen &&
                   profile.last_active_date !== todayStr &&
                   profile.last_active_date !== yesterdayStr;

  const current_streak = isBroken ? 0 : (profile.current_streak ?? 0);
  const longest_streak = profile.longest_streak ?? 0;
  const last_active_date = profile.last_active_date ?? null;
  const streak_frozen = profile.streak_frozen ?? false;
  const streak_freezes = profile.streak_freezes ?? 0;

  const streak: Streak = {
    currentStreak: current_streak,
    longestStreak: longest_streak,
    lastActiveDate: last_active_date,
    isFrozen: streak_frozen,
  };

  const updatedProfile: Profile = {
    ...profile,
    current_streak,
    longest_streak,
    last_active_date,
    streak_frozen,
    streak_freezes,
    admin_streak_override: null
  };

  const result: UserProgress = { profile: updatedProfile, activities, streak, freezeDates };
  setCache(cacheKey, result);
  return result;
}

// Helper to update profile's streak upon logging an activity
async function updateProfileStreakOnActivityLog(profileId: string, date: string): Promise<void> {
  invalidateCache(`progress_${profileId}`);

  let profile: Profile | null = null;

  if (isSupabaseConfigured && supabase) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    profile = profileData;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === profileId) || null;
  }

  if (!profile) return;

  const activityDate = parseLocalDate(date);
  const prevDate = new Date(activityDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = getLocalDateString(prevDate);

  let current_streak = profile.current_streak ?? 0;
  let longest_streak = profile.longest_streak ?? 0;
  let last_active_date = profile.last_active_date;
  let streak_frozen = profile.streak_frozen ?? false;

  if (!profile.last_active_date) {
    // First activity ever logged
    current_streak = 1;
    longest_streak = Math.max(longest_streak, current_streak);
    last_active_date = date;
    streak_frozen = false;
  } else if (date > profile.last_active_date) {
    // New calendar day activity
    const isContinuous = profile.last_active_date === prevDateStr || profile.streak_frozen;
    if (isContinuous) {
      current_streak = current_streak + 1;
    } else {
      current_streak = 1;
    }
    longest_streak = Math.max(longest_streak, current_streak);
    last_active_date = date;
    streak_frozen = false; // Unfreeze
  } else {
    // Same day upload or past day upload, do not change current_streak or last_active_date.
  }

  const streak_freezes = profile.streak_freezes ?? 0;

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak,
        longest_streak,
        last_active_date,
        streak_frozen,
        streak_freezes,
        admin_streak_override: null
      })
      .eq('id', profileId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      local.profiles[idx].current_streak = current_streak;
      local.profiles[idx].longest_streak = longest_streak;
      local.profiles[idx].last_active_date = last_active_date;
      local.profiles[idx].streak_frozen = streak_frozen;
      local.profiles[idx].streak_freezes = streak_freezes;
      local.profiles[idx].admin_streak_override = null;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${profileId}`);
}

export async function logActivity(
  profileId: string,
  date: string,
  count: number,
  category: string,
  notes: string | null,
  imageUrl: string | null = null
): Promise<Activity> {
  // Validate inputs
  if (count < 1) throw new Error('Problem count must be at least 1');
  if (!notes || !notes.trim()) throw new Error('Activity description is required');

  // Validate date: must be today or yesterday
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (date !== todayStr && date !== yesterdayStr) {
    throw new Error('You can only log activity for today or yesterday.');
  }

  // Invalidate cache for this user
  invalidateCache(`progress_${profileId}`);

  if (isSupabaseConfigured && supabase) {
    const { data: existing } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', profileId)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('activities')
        .update({
          count: existing.count + count,
          notes: notes ? (existing.notes ? `${existing.notes}; ${notes}` : notes) : existing.notes,
          category: category,
          image_url: imageUrl || existing.image_url,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (!error && data) {
        const multiplier = await getPointsPerProblem();
        const earned = count * multiplier;
        const { data: prof } = await supabase.from('profiles').select('points').eq('id', profileId).single();
        await supabase.from('profiles').update({ points: (prof?.points || 0) + earned }).eq('id', profileId);

        await updateProfileStreakOnActivityLog(profileId, date);
        return data;
      }
      console.error('Supabase activity update failed, running localStorage fallback:', error);
    } else {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: profileId,
          date,
          count,
          category,
          notes,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (!error && data) {
        const multiplier = await getPointsPerProblem();
        const earned = count * multiplier;
        const { data: prof } = await supabase.from('profiles').select('points').eq('id', profileId).single();
        await supabase.from('profiles').update({ points: (prof?.points || 0) + earned }).eq('id', profileId);

        await updateProfileStreakOnActivityLog(profileId, date);
        return data;
      }
      console.error('Supabase activity insert failed, running localStorage fallback:', error);
    }
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  const existingIdx = local.activities.findIndex(
    a => a.user_id === profileId && a.date === date
  );

  let updatedActivity: Activity;

  if (existingIdx > -1) {
    const current = local.activities[existingIdx];
    updatedActivity = {
      ...current,
      count: current.count + count,
      category,
      notes: notes ? (current.notes ? `${current.notes}; ${notes}` : notes) : current.notes,
      image_url: imageUrl || current.image_url,
    };
    local.activities[existingIdx] = updatedActivity;
  } else {
    updatedActivity = {
      id: `act-local-${Math.random().toString(36).substring(2, 11)}`,
      user_id: profileId,
      date,
      count,
      category,
      notes,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };
    local.activities.push(updatedActivity);
  }

  const multiplier = await getPointsPerProblem();
  const earned = count * multiplier;
  const pIdx = local.profiles.findIndex(p => p.id === profileId);
  if (pIdx > -1) {
    local.profiles[pIdx].points = (local.profiles[pIdx].points || 0) + earned;
  }

  saveLocalStorageData(local.profiles, local.activities);
  await updateProfileStreakOnActivityLog(profileId, date);
  return updatedActivity;
}

export async function addProfile(name: string, email: string | null, id: string): Promise<Profile> {
  const avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}`;
  invalidateCache('profiles');

  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id,
        name,
        email,
        avatar_url: avatar,
        is_admin: false,
        current_streak: 0,
        longest_streak: 0,
        streak_frozen: false,
        last_active_date: null,
        last_quiz_seen_at: nowStr,
        coding_profiles: [],
      })
      .select()
      .single();

    if (!error && data) return data;
    console.error('Supabase profile creation failed, running localStorage fallback:', error);
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  const newProfile: Profile = {
    id,
    name,
    email,
    avatar_url: avatar,
    is_admin: false,
    current_streak: 0,
    longest_streak: 0,
    streak_frozen: false,
    last_active_date: null,
    last_quiz_seen_at: nowStr,
    coding_profiles: [],
    created_at: new Date().toISOString(),
  };

  local.profiles.push(newProfile);
  saveLocalStorageData(local.profiles, local.activities);
  return newProfile;
}

export async function deleteProfile(profileId: string): Promise<boolean> {
  invalidateCache();

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('profiles').delete().eq('id', profileId);
    if (!error) return true;
    console.error('Supabase profile deletion failed, running localStorage fallback:', error);
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  const initialLen = local.profiles.length;
  local.profiles = local.profiles.filter(p => p.id !== profileId);
  local.activities = local.activities.filter(a => a.user_id !== profileId);

  saveLocalStorageData(local.profiles, local.activities);
  return local.profiles.length < initialLen;
}

// ─── Image Uploading API ────────────────────────────────────────────────────

export async function uploadWorkImage(file: File, userId: string): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('work-submissions')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Supabase Storage upload failed, converting to Base64 data URL instead:', uploadError);
    } else {
      const { data } = supabase.storage
        .from('work-submissions')
        .getPublicUrl(filePath);
        
      if (data && data.publicUrl) {
        return data.publicUrl;
      }
    }
  }

  // Client Side Base64 fallback (useful for Mock Mode)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

export async function updateProfileAvatar(userId: string, avatarUrl: string): Promise<void> {
  invalidateCache(`progress_${userId}`);
  invalidateCache('profiles');

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);
    if (error) throw error;
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].avatar_url = avatarUrl;
      saveLocalStorageData(local.profiles, local.activities, local.notifications, local.streak_freeze_usages);
    }
  }
}

// ─── Admin Dashboard Data ───────────────────────────────────────────────────

export async function getAdminDashboardData() {
  const local = getLocalStorageData();
  let dbProfiles = local.profiles;
  let dbActivities = local.activities;

  if (isSupabaseConfigured && supabase) {
    // Fetch profiles
    const { data: profilesData } = await supabase.from('profiles').select('*');
    if (profilesData) dbProfiles = profilesData;

    // Fetch activities
    const { data: activitiesData } = await supabase.from('activities').select('*');
    if (activitiesData) dbActivities = activitiesData;
  }

  // Filter out admin accounts from general streaks list
  const trainees = dbProfiles.filter(p => !p.is_admin);

  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const usersWithStreaks = trainees.map(profile => {
    const isBroken = !profile.streak_frozen &&
                     profile.last_active_date !== todayStr &&
                     profile.last_active_date !== yesterdayStr;
    const currentStreak = isBroken ? 0 : (profile.current_streak ?? 0);

    const streak: Streak = {
      currentStreak,
      longestStreak: profile.longest_streak ?? 0,
      lastActiveDate: profile.last_active_date ?? null,
      isFrozen: profile.streak_frozen ?? false,
    };
    return {
      ...profile,
      current_streak: currentStreak,
      streak,
    };
  });

  // Collect submissions with image urls, sorted by newest created_at first
  const submissions = dbActivities
    .filter(act => act.image_url)
    .map(act => {
      const profile = dbProfiles.find(p => p.id === act.user_id);
      return {
        ...act,
        userName: profile ? profile.name : 'Unknown User',
        avatarUrl: profile ? profile.avatar_url : null,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    trainees: usersWithStreaks,
    submissions,
  };
}

// ─── Admin Streak Management Powers ─────────────────────────────────────────

/**
 * Admin: Increase a user's streak. Modifies the profile directly.
 * The longest/best streak is only increased if the new current streak exceeds it.
 */
export async function adminIncreaseStreak(userId: string, days: number): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }
  if (!profile) return;

  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const isBroken = !profile.streak_frozen &&
                   profile.last_active_date !== todayStr &&
                   profile.last_active_date !== yesterdayStr;

  const current = isBroken ? 0 : (profile.current_streak ?? 0);
  const newStreak = current + days;
  const newLongest = Math.max(profile.longest_streak ?? 0, newStreak);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_active_date: todayStr,
        admin_streak_override: null
      })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].current_streak = newStreak;
      local.profiles[idx].longest_streak = newLongest;
      local.profiles[idx].last_active_date = todayStr;
      local.profiles[idx].admin_streak_override = null;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

/**
 * Admin: Decrease a user's streak. Modifies the profile directly.
 * Keeps the longest/best streak untouched!
 */
export async function adminDecreaseStreak(userId: string, days: number): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }
  if (!profile) return;

  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const isBroken = !profile.streak_frozen &&
                   profile.last_active_date !== todayStr &&
                   profile.last_active_date !== yesterdayStr;

  const current = isBroken ? 0 : (profile.current_streak ?? 0);
  const target = Math.max(0, current - days);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak: target,
        last_active_date: todayStr,
        admin_streak_override: null
      })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].current_streak = target;
      local.profiles[idx].last_active_date = todayStr;
      local.profiles[idx].admin_streak_override = null;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

/**
 * Admin: Stop/Reset a user's streak. Sets current streak to 0 and clears last active date.
 * Keeps the longest/best streak untouched!
 */
export async function adminRemoveStreak(userId: string): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak: 0,
        last_active_date: null,
        admin_streak_override: null
      })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].current_streak = 0;
      local.profiles[idx].last_active_date = null;
      local.profiles[idx].admin_streak_override = null;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

/**
 * Admin: Adjust a user's longest/best streak.
 */
export async function adminAdjustLongestStreak(userId: string, offset: number): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }

  if (!profile) return;

  const newLongest = Math.max(0, (profile.longest_streak ?? 0) + offset);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({ longest_streak: newLongest })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].longest_streak = newLongest;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

/**
 * Admin: Freeze or unfreeze a user's streak.
 * When frozen, the streak will not decay/reset to 0 even if the user logs no activity.
 */
export async function adminToggleFreezeStreak(userId: string, freeze: boolean): Promise<void> {
  invalidateCache();

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        streak_frozen: freeze
      })
      .eq('id', userId);
    return;
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  const idx = local.profiles.findIndex(p => p.id === userId);
  if (idx !== -1) {
    local.profiles[idx].streak_frozen = freeze;
    saveLocalStorageData(local.profiles, local.activities, local.notifications);
  }
}

/**
 * Consume one streak freeze token to preserve streak for yesterday.
 */
export async function consumeStreakFreeze(profileId: string): Promise<void> {
  invalidateCache(`progress_${profileId}`);

  const progress = await getUserProgress(profileId);
  if (!progress) throw new Error('User profile not found');

  const { profile, activities, freezeDates = [] } = progress;
  const freezes = profile.streak_freezes ?? 0;
  if (freezes <= 0) {
    throw new Error('No streak freezes available');
  }

  // Find yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Check if they already have an activity or freeze logged for yesterday
  const hasActivityYesterday = activities.some(a => a.date === yesterdayStr);
  const hasFreezeYesterday = freezeDates.includes(yesterdayStr);
  if (hasActivityYesterday || hasFreezeYesterday) {
    throw new Error('You already have an activity or freeze logged for yesterday.');
  }

  if (isSupabaseConfigured && supabase) {
    // 1. Insert Streak Freeze usage
    const { error: insertErr } = await supabase
      .from('streak_freeze_usages')
      .insert({
        user_id: profileId,
        date: yesterdayStr
      });

    if (insertErr) throw insertErr;

    // 2. Update profile row
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        streak_freezes: freezes - 1,
        last_active_date: yesterdayStr,
        admin_streak_override: null
      })
      .eq('id', profileId);

    if (updateErr) throw updateErr;
  } else {
    // LocalStorage Fallback
    const local = getLocalStorageData();
    const newFreeze: StreakFreezeUsage = {
      id: `freeze-local-${Math.random().toString(36).substring(2, 11)}`,
      user_id: profileId,
      date: yesterdayStr,
      created_at: new Date().toISOString(),
    };
    local.streak_freeze_usages.push(newFreeze);

    const idx = local.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      local.profiles[idx].streak_freezes = freezes - 1;
      local.profiles[idx].last_active_date = yesterdayStr;
    }
    saveLocalStorageData(local.profiles, local.activities, local.notifications, local.streak_freeze_usages);
  }

  invalidateCache(`progress_${profileId}`);
  await getUserProgress(profileId);
}

/**
 * Admin: Adjust a user's streak freezes count.
 */
export async function adminAdjustStreakFreezes(userId: string, amount: number): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }

  if (!profile) return;

  const currentFreezes = profile.streak_freezes ?? 0;
  const newFreezes = Math.max(0, currentFreezes + amount);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        streak_freezes: newFreezes
      })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].streak_freezes = newFreezes;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

// ─── Notification System ────────────────────────────────────────────────────

/**
 * Admin: Send a notification message to a specific user.
 */
export async function adminSendNotification(userId: string, message: string): Promise<Notification> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message,
        from_admin: true,
        is_read: false,
      })
      .select()
      .single();

    if (!error && data) return data;
    console.error('Supabase notification insert failed, using localStorage fallback:', error);
  }

  // LocalStorage fallback
  const notification: Notification = {
    id: `notif-${Math.random().toString(36).substring(2, 11)}`,
    user_id: userId,
    message,
    from_admin: true,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  const local = getLocalStorageData();
  local.notifications.push(notification);
  saveLocalStorageData(local.profiles, local.activities, local.notifications);
  return notification;
}

/**
 * Get all notifications for a specific user.
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
    console.error('Supabase notifications fetch failed, using localStorage fallback:', error);
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  return local.notifications
    .filter(n => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    return;
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  const idx = local.notifications.findIndex(n => n.id === notificationId);
  if (idx > -1) {
    local.notifications[idx].is_read = true;
    saveLocalStorageData(local.profiles, local.activities, local.notifications);
  }
}

/**
 * Mark ALL notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return;
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  local.notifications.forEach(n => {
    if (n.user_id === userId) n.is_read = true;
  });
  saveLocalStorageData(local.profiles, local.activities, local.notifications);
}

/**
 * Admin: Send a notification to all non-admin users.
 */
export async function adminSendNotificationToAll(message: string): Promise<void> {
  invalidateCache();

  const profiles = await getProfiles();
  const recipientIds = profiles.filter(p => !p.is_admin).map(p => p.id);

  if (isSupabaseConfigured && supabase) {
    const rows = recipientIds.map(userId => ({
      user_id: userId,
      message,
      from_admin: true,
      is_read: false,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw error;
    }
  } else {
    const local = getLocalStorageData();
    recipientIds.forEach(userId => {
      local.notifications.push({
        id: `notif-${Math.random().toString(36).substring(2, 11)}`,
        user_id: userId,
        message,
        from_admin: true,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    });
    saveLocalStorageData(local.profiles, local.activities, local.notifications, local.streak_freeze_usages);
  }
}

/**
 * User: Send a message to the admin inbox.
 */
export async function userSendMessageToAdmin(userId: string, message: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message,
        from_admin: false,
        is_read: false,
      });
    if (error) throw error;
  } else {
    const notification: Notification = {
      id: `notif-${Math.random().toString(36).substring(2, 11)}`,
      user_id: userId,
      message,
      from_admin: false,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const local = getLocalStorageData();
    local.notifications.push(notification);
    saveLocalStorageData(local.profiles, local.activities, local.notifications, local.streak_freeze_usages);
  }
}

/**
 * Admin: Retrieve all inbox messages sent from users.
 */
export async function getAdminMessages(): Promise<(Notification & { user_name: string })[]> {
  let messages: Notification[] = [];
  let profiles: { id: string; name: string }[] = [];

  if (isSupabaseConfigured && supabase) {
    const { data: notifData, error: notifErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('from_admin', false)
      .order('created_at', { ascending: false });

    if (notifErr) {
      console.error('Error fetching admin messages:', notifErr);
    } else {
      messages = notifData || [];
    }

    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('id, name');

    if (profErr) {
      console.error('Error fetching profiles for admin messages:', profErr);
    } else {
      profiles = profData || [];
    }
  } else {
    const local = getLocalStorageData();
    messages = local.notifications
      .filter(n => !n.from_admin)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    profiles = local.profiles;
  }

  const profileMap = new Map<string, string>();
  profiles.forEach(p => profileMap.set(p.id, p.name));

  return messages.map(m => ({
    ...m,
    user_name: profileMap.get(m.user_id) || 'Unknown User'
  }));
}

/**
 * Admin: Retrieve all notifications (both system broadcasts and trainee direct messages)
 */
export async function getAllNotificationsForAdmin(): Promise<(Notification & { user_name: string })[]> {
  let notifications: Notification[] = [];
  let profiles: { id: string; name: string }[] = [];

  if (isSupabaseConfigured && supabase) {
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: true });

    if (notifError) {
      console.error('Error fetching all notifications for admin:', notifError);
    } else {
      notifications = notifData || [];
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name');

    if (profileError) {
      console.error('Error fetching profiles for notifications:', profileError);
    } else {
      profiles = profileData || [];
    }
  } else {
    const local = getLocalStorageData();
    notifications = [...local.notifications].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    profiles = local.profiles;
  }

  const profileNameMap = new Map<string, string>();
  profiles.forEach(p => profileNameMap.set(p.id, p.name));

  return notifications.map(notif => ({
    ...notif,
    user_name: profileNameMap.get(notif.user_id) || 'Unknown User'
  }));
}

// ─── Points & Settings Management ───────────────────────────────────────────

/**
 * Admin: Adjust a user's point balance manually.
 */
export async function adminAdjustPoints(userId: string, amount: number): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }

  if (!profile) return;

  const currentPoints = profile.points ?? 0;
  const newPoints = Math.max(0, currentPoints + amount);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].points = newPoints;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

/**
 * Get the points-per-problem configuration.
 */
export async function getPointsPerProblem(): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'points_per_problem')
      .maybeSingle();
    if (!error && data && data.value) {
      return parseInt(data.value) || 10;
    }
  }
  
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem('tracker_points_per_problem');
    if (localVal) return parseInt(localVal) || 10;
  }
  return 10; // default
}

/**
 * Update the points-per-problem configuration.
 */
export async function updatePointsPerProblem(val: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('admin_settings')
      .upsert({ key: 'points_per_problem', value: String(val) });
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('tracker_points_per_problem', String(val));
  }
}

// ─── Quiz & Challenge Management ─────────────────────────────────────────────

/**
 * Fetch all quizzes sorted by newest first.
 */
export async function getQuizzes(): Promise<Quiz[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  }
  
  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('tracker_quizzes');
    return data ? JSON.parse(data) : [];
  }
  return [];
}

/**
 * Create a new quiz question (admin only).
 */
export async function addQuiz(quiz: Omit<Quiz, 'id' | 'created_at'>): Promise<Quiz> {
  const newQuiz: Quiz = {
    id: `quiz-${Math.random().toString(36).substring(2, 11)}`,
    ...quiz,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        title: quiz.title,
        description: quiz.description,
        option_a: quiz.option_a,
        option_b: quiz.option_b,
        option_c: quiz.option_c,
        option_d: quiz.option_d,
        correct_option: quiz.correct_option,
        reward_type: quiz.reward_type,
        reward_amount: quiz.reward_amount,
      })
      .select()
      .single();
    if (!error && data) return data;
    throw error || new Error('Failed to insert quiz in Supabase');
  }

  // LocalStorage fallback
  const quizzes = await getQuizzes();
  quizzes.push(newQuiz);
  localStorage.setItem('tracker_quizzes', JSON.stringify(quizzes));
  return newQuiz;
}

/**
 * Update an existing quiz question (admin only).
 */
export async function updateQuiz(id: string, quizData: Partial<Quiz>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('quizzes')
      .update(quizData)
      .eq('id', id);
    if (error) throw error;
    return;
  }

  const quizzes = await getQuizzes();
  const idx = quizzes.findIndex(q => q.id === id);
  if (idx > -1) {
    quizzes[idx] = { ...quizzes[idx], ...quizData };
    localStorage.setItem('tracker_quizzes', JSON.stringify(quizzes));
  }
}

/**
 * Delete a quiz question (admin only).
 */
export async function deleteQuiz(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return;
  }

  const quizzes = await getQuizzes();
  const updated = quizzes.filter(q => q.id !== id);
  localStorage.setItem('tracker_quizzes', JSON.stringify(updated));
}

/**
 * Fetch all quiz answers submitted by a user.
 */
export async function getUserSubmissions(userId: string): Promise<QuizSubmission[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('user_id', userId);
    if (!error && data) return data;
  }

  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('tracker_quiz_submissions');
    const all = data ? JSON.parse(data) : [];
    return all.filter((s: QuizSubmission) => s.user_id === userId);
  }
  return [];
}

/**
 * Submit an answer to a quiz and award the reward if correct.
 */
export async function submitQuizAnswer(
  userId: string,
  quizId: string,
  selectedOption: string
): Promise<{ isCorrect: boolean; rewardEarned: string }> {
  // 1. Fetch Quiz Details
  let quiz: Quiz | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
    quiz = data;
  } else {
    const quizzes = await getQuizzes();
    quiz = quizzes.find(q => q.id === quizId) || null;
  }

  if (!quiz) throw new Error('Quiz not found');

  const isCorrect = quiz.correct_option === selectedOption;
  let rewardEarned = 'None';

  if (isCorrect) {
    rewardEarned = `+${quiz.reward_amount} ${quiz.reward_type}`;
  }

  if (isSupabaseConfigured && supabase) {
    // Check if they already answered to prevent duplicate insert errors
    const { data: existing } = await supabase
      .from('quiz_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();

    if (existing) {
      throw new Error('You have already answered this quiz question.');
    }

    const { error: insertErr } = await supabase
      .from('quiz_submissions')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        reward_earned: isCorrect ? rewardEarned : null,
      });

    if (insertErr) throw insertErr;

    // 3. Grant Reward if correct
    if (isCorrect) {
      if (quiz.reward_type === 'points') {
        const { data: profile } = await supabase.from('profiles').select('points').eq('id', userId).single();
        const currentPoints = profile?.points || 0;
        await supabase
          .from('profiles')
          .update({ points: currentPoints + quiz.reward_amount })
          .eq('id', userId);
      } else if (quiz.reward_type === 'freeze') {
        const { data: profile } = await supabase.from('profiles').select('streak_freezes').eq('id', userId).single();
        const currentFreezes = profile?.streak_freezes || 0;
        await supabase
          .from('profiles')
          .update({ streak_freezes: currentFreezes + quiz.reward_amount })
          .eq('id', userId);
      }
    }
  } else {
    // LocalStorage Fallback
    const local = getLocalStorageData();
    const dataSub = localStorage.getItem('tracker_quiz_submissions');
    const allSubs = dataSub ? JSON.parse(dataSub) : [];
    
    const exists = allSubs.some((s: QuizSubmission) => s.user_id === userId && s.quiz_id === quizId);
    if (exists) {
      throw new Error('You have already answered this quiz question.');
    }

    const submission: QuizSubmission = {
      id: `sub-${Math.random().toString(36).substring(2, 11)}`,
      user_id: userId,
      quiz_id: quizId,
      selected_option: selectedOption,
      is_correct: isCorrect,
      reward_earned: isCorrect ? rewardEarned : null,
      created_at: new Date().toISOString()
    };
    allSubs.push(submission);
    localStorage.setItem('tracker_quiz_submissions', JSON.stringify(allSubs));

    if (isCorrect) {
      const pIdx = local.profiles.findIndex(p => p.id === userId);
      if (pIdx > -1) {
        const currentProf = local.profiles[pIdx];
        if (quiz.reward_type === 'points') {
          local.profiles[pIdx].points = (currentProf.points || 0) + quiz.reward_amount;
        } else if (quiz.reward_type === 'freeze') {
          local.profiles[pIdx].streak_freezes = (currentProf.streak_freezes || 0) + quiz.reward_amount;
        }
        saveLocalStorageData(local.profiles, local.activities, local.notifications);
      }
    }
  }

  // Invalidate user cache to ensure statistics update immediately
  invalidateCache(`progress_${userId}`);
  invalidateCache('profiles');

  return { isCorrect, rewardEarned };
}

/**
 * Admin: Retrieve all quiz submissions with user names and quiz details.
 */
export async function getQuizSubmissionsForAdmin(): Promise<(QuizSubmission & { user_name: string; quiz_title: string; correct_option: string })[]> {
  let submissions: QuizSubmission[] = [];
  let profiles: any[] = [];
  let quizzes: any[] = [];

  if (isSupabaseConfigured && supabase) {
    const { data: subData, error: subErr } = await supabase.from('quiz_submissions').select('*');
    if (subErr) console.error(subErr);
    else submissions = subData || [];

    const { data: profData, error: profErr } = await supabase.from('profiles').select('id, name');
    if (profErr) console.error(profErr);
    else profiles = profData || [];

    const { data: quizData, error: quizErr } = await supabase.from('quizzes').select('id, title, correct_option');
    if (quizErr) console.error(quizErr);
    else quizzes = quizData || [];
  } else {
    if (typeof window !== 'undefined') {
      const localSub = localStorage.getItem('tracker_quiz_submissions');
      submissions = localSub ? JSON.parse(localSub) : [];
    }
    const local = getLocalStorageData();
    profiles = local.profiles;
    quizzes = await getQuizzes();
  }

  const profileMap = new Map<string, string>();
  profiles.forEach(p => profileMap.set(p.id, p.name));

  const quizMap = new Map<string, { title: string; correct_option: string }>();
  quizzes.forEach(q => quizMap.set(q.id, { title: q.title, correct_option: q.correct_option }));

  return submissions.map(s => {
    const quizInfo = quizMap.get(s.quiz_id) || { title: 'Unknown Quiz', correct_option: 'N/A' };
    return {
      ...s,
      user_name: profileMap.get(s.user_id) || 'Unknown User',
      quiz_title: quizInfo.title,
      correct_option: quizInfo.correct_option
    };
  });
}

/**
 * Update the user's last_quiz_seen_at timestamp to now.
 */
export async function updateLastQuizSeenAt(userId: string): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  const nowStr = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({
        last_quiz_seen_at: nowStr,
      })
      .eq('id', userId);
    if (error) {
      console.error('Error updating last_quiz_seen_at in Supabase:', error);
    }
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].last_quiz_seen_at = nowStr;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  // Refresh progress cache
  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}

/**
 * Save coding profile links (platform/url) to user profile.
 */
export async function updateCodingProfiles(
  userId: string,
  codingProfiles: { platform: string; url: string }[]
): Promise<void> {
  invalidateCache();
  invalidateCache(`progress_${userId}`);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({
        coding_profiles: codingProfiles
      })
      .eq('id', userId);
    if (error) {
      console.error('Error updating coding_profiles in Supabase:', error);
      throw error;
    }
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].coding_profiles = codingProfiles;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }

  // Refresh cache
  invalidateCache(`progress_${userId}`);
  await getUserProgress(userId);
}



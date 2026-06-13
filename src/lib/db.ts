import { createClient } from '@supabase/supabase-js';
import { Profile, Activity, Streak, UserProgress, Notification, StreakFreezeUsage } from '../types';

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

function invalidateCache(prefix?: string): void {
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

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching Supabase profiles, using fallback:', error);
      return getLocalStorageData().profiles;
    }
    const result = data || [];
    setCache('profiles', result);
    return result;
  } else {
    const result = getLocalStorageData().profiles;
    setCache('profiles', result);
    return result;
  }
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

  // Recalculate streak dynamically based on activities list and freezeDates
  const dynamicStreak = calculateStreak(activities, freezeDates);
  let current_streak = dynamicStreak.currentStreak;
  const longest_streak = Math.max(profile.longest_streak ?? 0, dynamicStreak.longestStreak, dynamicStreak.currentStreak);
  let last_active_date = dynamicStreak.lastActiveDate;
  let streak_frozen = profile.streak_frozen ?? false;
  const streak_freezes = profile.streak_freezes ?? 0;

  if (streak_frozen) {
    // If the streak is frozen, don't let it decay to 0. Keep the stored current_streak unless the dynamic calculations show a higher value
    if (profile.current_streak !== undefined && profile.current_streak > current_streak) {
      current_streak = profile.current_streak;
      last_active_date = profile.last_active_date ?? null;
    } else {
      // If the dynamic streak is higher or they logged a new activity, automatically unfreeze
      streak_frozen = false;
    }
  }

  // If the calculated values differ from stored, update DB/localStorage
  const needsUpdate = profile.current_streak !== current_streak ||
                      profile.longest_streak !== longest_streak ||
                      profile.last_active_date !== last_active_date ||
                      profile.streak_frozen !== streak_frozen ||
                      profile.streak_freezes === undefined;

  if (needsUpdate) {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('profiles')
        .update({
          current_streak,
          longest_streak,
          last_active_date,
          streak_frozen,
          streak_freezes
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
        saveLocalStorageData(local.profiles, local.activities, local.notifications);
      }
    }
    profile.current_streak = current_streak;
    profile.longest_streak = longest_streak;
    profile.last_active_date = last_active_date;
    profile.streak_frozen = streak_frozen;
    profile.streak_freezes = streak_freezes;
  } else {
    profile.streak_freezes = streak_freezes;
  }

  const streak: Streak = {
    currentStreak: current_streak,
    longestStreak: longest_streak,
    lastActiveDate: last_active_date,
    isFrozen: streak_frozen,
  };

  const result: UserProgress = { profile, activities, streak, freezeDates };
  setCache(cacheKey, result);
  return result;
}

// Helper to update profile's streak upon logging an activity
async function updateProfileStreakOnActivityLog(profileId: string): Promise<void> {
  invalidateCache(`progress_${profileId}`);
  await getUserProgress(profileId);
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
        await updateProfileStreakOnActivityLog(profileId);
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
        await updateProfileStreakOnActivityLog(profileId);
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

  saveLocalStorageData(local.profiles, local.activities);
  await updateProfileStreakOnActivityLog(profileId);
  return updatedActivity;
}

export async function addProfile(name: string, email: string | null, id: string): Promise<Profile> {
  const avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}`;
  invalidateCache('profiles');

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

  const usersWithStreaks = trainees.map(profile => {
    const streak: Streak = {
      currentStreak: profile.current_streak ?? 0,
      longestStreak: profile.longest_streak ?? 0,
      lastActiveDate: profile.last_active_date ?? null,
      isFrozen: profile.streak_frozen ?? false,
    };
    return {
      ...profile,
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

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }

  if (!profile) return;

  const current_streak = profile.current_streak ?? 0;
  const longest_streak = profile.longest_streak ?? 0;
  const newCurrent = current_streak + days;
  const newLongest = Math.max(longest_streak, newCurrent);

  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const newLastActive = (profile.last_active_date === todayStr || profile.last_active_date === yesterdayStr)
    ? profile.last_active_date
    : todayStr;

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_active_date: newLastActive
      })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].current_streak = newCurrent;
      local.profiles[idx].longest_streak = newLongest;
      local.profiles[idx].last_active_date = newLastActive;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }
}

/**
 * Admin: Decrease a user's streak. Modifies the profile directly.
 * Keeps the longest/best streak untouched!
 */
export async function adminDecreaseStreak(userId: string, days: number): Promise<void> {
  invalidateCache();

  let profile: Profile | null = null;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    profile = data;
  } else {
    const local = getLocalStorageData();
    profile = local.profiles.find(p => p.id === userId) || null;
  }

  if (!profile) return;

  const current_streak = profile.current_streak ?? 0;
  const newCurrent = Math.max(0, current_streak - days);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak: newCurrent
      })
      .eq('id', userId);
  } else {
    const local = getLocalStorageData();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx !== -1) {
      local.profiles[idx].current_streak = newCurrent;
      saveLocalStorageData(local.profiles, local.activities, local.notifications);
    }
  }
}

/**
 * Admin: Stop/Reset a user's streak. Sets current streak to 0 and clears last active date.
 * Keeps the longest/best streak untouched!
 */
export async function adminRemoveStreak(userId: string): Promise<void> {
  invalidateCache();

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        current_streak: 0,
        last_active_date: null
      })
      .eq('id', userId);
    return;
  }

  // LocalStorage fallback
  const local = getLocalStorageData();
  const idx = local.profiles.findIndex(p => p.id === userId);
  if (idx !== -1) {
    local.profiles[idx].current_streak = 0;
    local.profiles[idx].last_active_date = null;
    saveLocalStorageData(local.profiles, local.activities, local.notifications);
  }
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

  const updatedFreezeDates = [...freezeDates, yesterdayStr];

  if (isSupabaseConfigured && supabase) {
    // 1. Insert Streak Freeze usage
    const { error: insertErr } = await supabase
      .from('streak_freeze_usages')
      .insert({
        user_id: profileId,
        date: yesterdayStr
      });

    if (insertErr) throw insertErr;

    // 2. Recalculate dynamic streak
    const newStreak = calculateStreak(activities, updatedFreezeDates);

    // 3. Update profile row
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        streak_freezes: freezes - 1,
        current_streak: newStreak.currentStreak,
        longest_streak: newStreak.longestStreak,
        last_active_date: yesterdayStr,
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

    const newStreak = calculateStreak(activities, updatedFreezeDates);

    const idx = local.profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      local.profiles[idx].streak_freezes = freezes - 1;
      local.profiles[idx].current_streak = newStreak.currentStreak;
      local.profiles[idx].longest_streak = newStreak.longestStreak;
      local.profiles[idx].last_active_date = yesterdayStr;
    }
    saveLocalStorageData(local.profiles, local.activities, local.notifications, local.streak_freeze_usages);
  }
}

/**
 * Admin: Adjust a user's streak freezes count.
 */
export async function adminAdjustStreakFreezes(userId: string, amount: number): Promise<void> {
  invalidateCache();

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
}

// ─── Notification System ────────────────────────────────────────────────────

/**
 * Admin: Send a notification message to a specific user.
 */
export async function adminSendNotification(userId: string, message: string): Promise<Notification> {
  const notification: Notification = {
    id: `notif-${Math.random().toString(36).substring(2, 11)}`,
    user_id: userId,
    message,
    from_admin: true,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (!error && data) return data;
    console.error('Supabase notification insert failed, using localStorage fallback:', error);
  }

  // LocalStorage fallback
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

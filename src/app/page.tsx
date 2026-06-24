'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, UserProgress, Quiz, QuizSubmission, Notification } from '../types';
import {
  getUserProgress,
  logActivity,
  checkSupabaseStatus,
  getSessionProfile,
  logoutUser,
  consumeStreakFreeze,
  updateProfileAvatar,
  uploadWorkImage,
  userSendMessageToAdmin,
  getProfiles,
  getQuizzes,
  getUserSubmissions,
  submitQuizAnswer,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateLastQuizSeenAt,
  supabase,
  updateCodingProfiles,
} from '../lib/db';
import StreakCard from '../components/StreakCard';
import Heatmap from '../components/Heatmap';
import BarGraph from '../components/BarGraph';
import ActivityForm from '../components/ActivityForm';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isSupabase, setIsSupabase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState('');

  // New states for Points, Leaderboard, and Quizzes
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState<Record<string, boolean>>({});
  const [quizResults, setQuizResults] = useState<Record<string, { isCorrect: boolean; rewardEarned: string }>>({});
  const [quizErrors, setQuizErrors] = useState<Record<string, string>>({});

  // UI Navigation and Notification states
  const [activeTab, setActiveTab] = useState<'home' | 'activity' | 'challenges' | 'leaderboard' | 'messages' | 'notifications'>('home');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [unseenQuizCount, setUnseenQuizCount] = useState(0);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false);

  // Coding Profiles States
  const [codingProfiles, setCodingProfiles] = useState<{ platform: string; url: string }[]>([]);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [editingProfileIdx, setEditingProfileIdx] = useState<number | null>(null);
  const [profilePlatform, setProfilePlatform] = useState('LeetCode');
  const [profileUrl, setProfileUrl] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Fetch dashboard progress, leaderboard, and challenges
  const loadDashboardData = useCallback(async (userId: string) => {
    try {
      const progress = await getUserProgress(userId);
      setUserProgress(progress);
      if (progress && progress.profile) {
        setCurrentUser(progress.profile);
      }

      const profilesList = await getProfiles();
      setAllProfiles(profilesList);

      const quizList = await getQuizzes();
      // Filter out quizzes older than 24 hours
      const activeQuizzes = quizList.filter(quiz => {
        const createdTime = new Date(quiz.created_at).getTime();
        const expirationTime = createdTime + 24 * 60 * 60 * 1000;
        return Date.now() < expirationTime;
      });
      setQuizzes(activeQuizzes);

      // Calculate unseen quiz count
      const lastSeen = progress?.profile?.last_quiz_seen_at
        ? new Date(progress.profile.last_quiz_seen_at).getTime()
        : 0;
      const unseenCount = quizList.filter(quiz => {
        return new Date(quiz.created_at).getTime() > lastSeen;
      }).length;
      setUnseenQuizCount(unseenCount);

      const subList = await getUserSubmissions(userId);
      setSubmissions(subList);

      const notifs = await getUserNotifications(userId);
      setNotifications(notifs);
    } catch (err) {
      setDbError('Error loading dashboard metrics from database');
      console.error(err);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    async function init() {
      const configured = await checkSupabaseStatus();
      setIsSupabase(configured);
      
      const profile = await getSessionProfile();
      if (!profile) {
        // Not logged in -> Redirect to login page
        router.push('/login');
        return;
      }
      
      setCurrentUser(profile);
      await loadDashboardData(profile.id);
      setLoading(false);
    }
    init();
  }, [router, loadDashboardData]);

  // Update last_quiz_seen_at when the Challenges tab is opened
  useEffect(() => {
    if (activeTab === 'challenges' && currentUser) {
      const userId = currentUser.id;
      async function markQuizzesSeen() {
        try {
          await updateLastQuizSeenAt(userId);
          const updatedProfile = await getSessionProfile();
          if (updatedProfile) {
            setCurrentUser(updatedProfile);
          }
          setUnseenQuizCount(0);
        } catch (err) {
          console.error('Failed to update last_quiz_seen_at:', err);
        }
      }
      markQuizzesSeen();
    }
  }, [activeTab, currentUser]);

  // Poll for notifications
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const notifs = await getUserNotifications(currentUser.id);
        setNotifications(notifs);
      } catch (err) {
        console.error('Error polling notifications:', err);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkRead = useCallback(async (notifId: string) => {
    if (!currentUser) return;
    await markNotificationRead(notifId);
    const notifs = await getUserNotifications(currentUser.id);
    setNotifications(notifs);
  }, [currentUser]);

  const handleMarkAllRead = useCallback(async () => {
    if (!currentUser) return;
    await markAllNotificationsRead(currentUser.id);
    const notifs = await getUserNotifications(currentUser.id);
    setNotifications(notifs);
  }, [currentUser]);

  const handleLogActivity = useCallback(async (
    date: string,
    count: number,
    category: string,
    notes: string | null,
    imageUrl: string | null
  ) => {
    if (!currentUser) return;
    await logActivity(currentUser.id, date, count, category, notes, imageUrl);
    await loadDashboardData(currentUser.id);
  }, [currentUser, loadDashboardData]);

  const handleUseFreeze = useCallback(async () => {
    if (!currentUser) return;
    try {
      await consumeStreakFreeze(currentUser.id);
      await loadDashboardData(currentUser.id);
    } catch (err: any) {
      console.error('Error using streak freeze:', err);
      alert(err.message || 'Failed to use streak freeze.');
    }
  }, [currentUser, loadDashboardData]);

  const handleQuizSubmit = useCallback(async (quizId: string) => {
    if (!currentUser) return;
    const answer = selectedAnswers[quizId];
    if (!answer) return;

    setQuizSubmitting(prev => ({ ...prev, [quizId]: true }));
    setQuizErrors(prev => ({ ...prev, [quizId]: '' }));

    try {
      const result = await submitQuizAnswer(currentUser.id, quizId, answer);
      setQuizResults(prev => ({ ...prev, [quizId]: result }));
      await loadDashboardData(currentUser.id);
    } catch (err: any) {
      console.error(err);
      setQuizErrors(prev => ({ ...prev, [quizId]: err.message || 'Failed to submit quiz answer.' }));
    } finally {
      setQuizSubmitting(prev => ({ ...prev, [quizId]: false }));
    }
  }, [currentUser, selectedAnswers, loadDashboardData]);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate format (.jpg, .jpeg, .png, .webp, .gif)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const isValid = allowedExts.includes(fileExt || '') || allowedTypes.includes(file.type);
    
    if (!isValid) {
      setAvatarError('Only JPG, PNG, WEBP, or GIF are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Avatar must be under 2MB');
      return;
    }

    setAvatarError('');
    setAvatarUploading(true);

    try {
      const uploadedUrl = await uploadWorkImage(file, currentUser.id);
      await updateProfileAvatar(currentUser.id, uploadedUrl);
      
      // Update local user state immediately
      setCurrentUser(prev => prev ? { ...prev, avatar_url: uploadedUrl } : null);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAvatarError('Failed to upload profile picture.');
    } finally {
      setAvatarUploading(false);
    }
  }, [currentUser]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!currentUser) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const defaultAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser.name)}`;
      await updateProfileAvatar(currentUser.id, defaultAvatarUrl);
      setCurrentUser(prev => prev ? { ...prev, avatar_url: defaultAvatarUrl } : null);
    } catch (err) {
      console.error('Error removing avatar:', err);
      setAvatarError('Failed to remove profile picture.');
    } finally {
      setAvatarUploading(false);
    }
  }, [currentUser]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setChangePasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters');
      return;
    }

    setChangePasswordSubmitting(true);

    try {
      if (isSupabase && supabase && currentUser?.email) {
        // 1. Re-authenticate user to verify their current password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword,
        });

        if (signInError) {
          throw new Error('Incorrect current password');
        }

        // 2. Update to the new password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        // Mock mode password change
        const localProfiles = localStorage.getItem('tracker_profiles');
        const profilesList = localProfiles ? JSON.parse(localProfiles) : [];
        const idx = profilesList.findIndex((p: { id: string }) => p.id === currentUser?.id);
        
        if (idx !== -1) {
          const storedPassword = profilesList[idx].password;
          if (storedPassword && storedPassword !== currentPassword) {
            throw new Error('Incorrect current password');
          }
          
          profilesList[idx].password = newPassword;
          localStorage.setItem('tracker_profiles', JSON.stringify(profilesList));
          
          // Update tracker_session to match
          const sessionData = localStorage.getItem('tracker_session');
          if (sessionData) {
            const parsedSession = JSON.parse(sessionData);
            parsedSession.password = newPassword;
            localStorage.setItem('tracker_session', JSON.stringify(parsedSession));
          }
        }
      }

      setChangePasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      console.error('Change password failed:', err);
      if (err instanceof Error) {
        setChangePasswordError(err.message);
      } else {
        setChangePasswordError('Failed to change password. Please try again.');
      }
    } finally {
      setChangePasswordSubmitting(false);
    }
  }, [currentUser, currentPassword, newPassword, confirmNewPassword, isSupabase]);

  // Sync coding profiles from currentUser whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCodingProfiles(currentUser.coding_profiles || []);
    }
  }, [currentUser]);

  const handleSaveProfileLink = useCallback(async () => {
    if (!currentUser) return;
    setProfileError('');

    const urlTrimmed = profileUrl.trim();
    if (!urlTrimmed) {
      setProfileError('URL must not be empty');
      return;
    }

    // Basic URL validation
    const isValid = urlTrimmed.startsWith('http://') || urlTrimmed.startsWith('https://');
    if (!isValid) {
      setProfileError('Invalid URL (must start with http:// or https://)');
      return;
    }

    setProfileSaving(true);
    try {
      const updated = [...codingProfiles];
      const newEntry = { platform: profilePlatform, url: urlTrimmed };
      
      if (isAddingProfile) {
        updated.push(newEntry);
      } else if (editingProfileIdx !== null) {
        updated[editingProfileIdx] = newEntry;
      }

      await updateCodingProfiles(currentUser.id, updated);
      
      // Update local state to reflect change immediately
      setCurrentUser(prev => prev ? { ...prev, coding_profiles: updated } : null);
      setCodingProfiles(updated);

      // Reset states
      setIsAddingProfile(false);
      setEditingProfileIdx(null);
      setProfileUrl('');
    } catch (err) {
      console.error('Error saving coding profile:', err);
      setProfileError('Failed to save profile link.');
    } finally {
      setProfileSaving(false);
    }
  }, [currentUser, codingProfiles, isAddingProfile, editingProfileIdx, profilePlatform, profileUrl]);

  const handleRemoveProfileLink = useCallback(async () => {
    if (!currentUser || editingProfileIdx === null) return;
    
    setProfileSaving(true);
    setProfileError('');
    try {
      const updated = codingProfiles.filter((_, idx) => idx !== editingProfileIdx);
      await updateCodingProfiles(currentUser.id, updated);

      setCurrentUser(prev => prev ? { ...prev, coding_profiles: updated } : null);
      setCodingProfiles(updated);

      setIsAddingProfile(false);
      setEditingProfileIdx(null);
      setProfileUrl('');
    } catch (err) {
      console.error('Error removing coding profile:', err);
      setProfileError('Failed to remove profile link.');
    } finally {
      setProfileSaving(false);
    }
  }, [currentUser, codingProfiles, editingProfileIdx]);

  const [adminMessageText, setAdminMessageText] = useState('');
  const [adminMessageSending, setAdminMessageSending] = useState(false);
  const [adminMessageSuccess, setAdminMessageSuccess] = useState('');
  const [adminMessageError, setAdminMessageError] = useState('');

  const handleSendMessageToAdmin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !adminMessageText.trim()) return;

    setAdminMessageSending(true);
    setAdminMessageError('');
    setAdminMessageSuccess('');

    try {
      await userSendMessageToAdmin(currentUser.id, adminMessageText.trim());
      setAdminMessageSuccess('Message sent to Admin! 🛡️');
      setAdminMessageText('');
      setTimeout(() => setAdminMessageSuccess(''), 3000);
    } catch (err) {
      console.error('Error sending message to admin:', err);
      setAdminMessageError('Failed to send message.');
    } finally {
      setAdminMessageSending(false);
    }
  }, [currentUser, adminMessageText]);

  const handleSignOut = useCallback(async () => {
    await logoutUser();
    router.push('/login');
  }, [router]);

  const isDefaultAvatar = !currentUser?.avatar_url || currentUser.avatar_url.includes('api.dicebear.com');

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(14, 165, 233, 0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ color: 'var(--foreground-muted)', fontWeight: 500 }}>Checking session credentials...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header Section */}
      <header className="main-header" style={{ gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--success) 100%)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', lineHeight: '1.1', color: '#fff' }}>
              ASCEND
            </span>
            <span className="brand-subtitle" style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--foreground-muted)', letterSpacing: '0.05em' }}>
              by Consistency Club
            </span>
          </div>
        </div>

        {/* Top Navigation Bar */}
        {currentUser && (
          <nav className="desktop-only-nav" style={{ display: 'flex', gap: '0.25rem', flexGrow: 1, justifyContent: 'center' }}>
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'activity', label: 'Activity', icon: '📈' },
              { id: 'challenges', label: 'Challenges', icon: '🧠' },
              { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
              { id: 'messages', label: 'Messages', icon: '💬' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    position: 'relative',
                    background: isActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--primary)' : 'var(--foreground-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    transition: 'var(--transition-smooth)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.id === 'challenges' && unseenQuizCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1
                    }}>
                      {unseenQuizCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right side: Notification Bell, DB Status Badge & Admin Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser && (
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="mobile-hamburger-btn"
              title="Open Navigation Menu"
              style={{ position: 'relative' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              {unseenQuizCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}>
                  {unseenQuizCount}
                </span>
              )}
            </button>
          )}
          {currentUser && (
            <button
              onClick={() => setActiveTab('notifications')}
              title="Notifications Center"
              style={{
                position: 'relative',
                background: 'none',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--foreground)',
                transition: 'var(--transition-smooth)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.background = 'none';
              }}
            >
              <span style={{ fontSize: '1.05rem' }}>🔔</span>
              {(() => {
                const count = notifications.filter(n => !n.is_read && n.from_admin).length;
                return count > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--danger)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {count}
                  </span>
                ) : null;
              })()}
            </button>
          )}

          {currentUser?.is_admin && (
            <button
              onClick={() => router.push('/admin')}
              className="btn-primary"
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', boxShadow: 'none' }}
            >
              Admin 🛡️
            </button>
          )}

          {isSupabase ? (
            <div className="status-badge status-badge--online">
              <span className="status-dot status-dot--online" />
              <span className="status-badge-text">Connected</span>
            </div>
          ) : (
            <div className="status-badge status-badge--offline" title="Offline local storage simulation mode active">
              <span className="status-dot status-dot--offline" />
              <span className="status-badge-text">Offline</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="main-content" style={{
        maxWidth: '1200px',
      }}>
        
        {dbError && (
          <div style={{
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            {dbError}
          </div>
        )}

        {userProgress && currentUser && (
          <>
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <div className="dashboard-layout-grid">
                {/* Left Profile Column */}
                <section style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                    
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', width: '100%' }}>
                      👤 My Profile
                    </h3>

                    {/* Profile Picture Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ position: 'relative' }}>
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img
                         src={currentUser?.avatar_url || (currentUser?.name ? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser.name)}` : '')}
                         alt={currentUser?.name}
                         style={{
                           width: '90px',
                           height: '90px',
                           borderRadius: '50%',
                           border: '3px solid rgba(255, 255, 255, 0.1)',
                           boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                           objectFit: 'cover'
                         }}
                       />
                       <div style={{
                         position: 'absolute',
                         bottom: '4px',
                         right: '4px',
                         width: '18px',
                         height: '18px',
                         borderRadius: '50%',
                         background: 'var(--success)',
                         border: '2px solid var(--bg-main)',
                         display: 'inline-block'
                       }} />
                      </div>

                      <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>{currentUser?.name}</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem', marginBottom: 0 }}>{currentUser?.email}</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        {isDefaultAvatar ? (
                          <label style={{
                            fontSize: '0.75rem',
                            color: 'var(--primary)',
                            cursor: avatarUploading ? 'not-allowed' : 'pointer',
                            border: '1px solid rgba(14, 165, 233, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(14, 165, 233, 0.05)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'var(--transition-smooth)',
                            opacity: avatarUploading ? 0.7 : 1,
                          }}>
                            <span>{avatarUploading ? '⏳ Uploading...' : '📷 Upload Profile Picture'}</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,.gif"
                              onChange={handleAvatarUpload}
                              disabled={avatarUploading}
                              style={{ display: 'none' }}
                            />
                          </label>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                            <label style={{
                              fontSize: '0.75rem',
                              color: 'var(--primary)',
                              cursor: avatarUploading ? 'not-allowed' : 'pointer',
                              border: '1px solid rgba(14, 165, 233, 0.3)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(14, 165, 233, 0.05)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'var(--transition-smooth)',
                              opacity: avatarUploading ? 0.7 : 1,
                            }}>
                              <span>{avatarUploading ? '⏳ Uploading...' : '📷 Update Profile Picture'}</span>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.gif"
                                onChange={handleAvatarUpload}
                                disabled={avatarUploading}
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              onClick={handleRemoveAvatar}
                              disabled={avatarUploading}
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--danger)',
                                cursor: avatarUploading ? 'not-allowed' : 'pointer',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.05)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'var(--transition-smooth)',
                                opacity: avatarUploading ? 0.7 : 1,
                              }}
                            >
                              <span>🗑️ Remove Profile Picture</span>
                            </button>
                          </div>
                        )}
                        {avatarError && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '4px' }}>
                            {avatarError}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats details */}
                    <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', textAlign: 'left', color: 'var(--foreground-muted)', paddingTop: '1rem' }}>
                      <div>
                        Joined:{' '}
                        <strong style={{ color: 'var(--foreground)' }}>
                          {currentUser ? new Date(currentUser.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ''}
                        </strong>
                      </div>
                      <div>
                        Total Points:{' '}
                        <strong style={{ color: 'var(--success)' }}>
                          {currentUser?.points ?? 0} ⭐
                        </strong>
                      </div>
                      <div>
                        Trainee ID:{' '}
                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px', color: 'var(--primary)', wordBreak: 'break-all' }}>
                          {currentUser?.id}
                        </code>
                      </div>
                    </div>

                    {/* Coding Profiles Compartment */}
                    <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔗 Coding Profiles
                      </span>
                      
                      {/* Render existing profiles */}
                      {codingProfiles.length === 0 && !isAddingProfile && editingProfileIdx === null && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', margin: 0 }}>
                          No coding profiles saved yet.
                        </p>
                      )}

                      {codingProfiles.length > 0 && !isAddingProfile && editingProfileIdx === null && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {codingProfiles.map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, marginRight: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{p.platform}</span>
                                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                                  {p.url}
                                </a>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingProfileIdx(idx);
                                  setProfilePlatform(p.platform);
                                  setProfileUrl(p.url);
                                  setProfileError('');
                                }}
                                className="adjust-btn"
                                style={{ padding: '2px 6px', fontSize: '0.7rem', flexShrink: 0 }}
                              >
                                ✏️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add / Edit Form */}
                      {(isAddingProfile || editingProfileIdx !== null) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                            {isAddingProfile ? '➕ Add Profile' : '✏️ Edit Profile'}
                          </span>
                          
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--foreground-muted)', marginBottom: '0.2rem' }}>
                              Platform
                            </label>
                            <select
                              value={profilePlatform}
                              onChange={(e) => setProfilePlatform(e.target.value)}
                              className="input-field"
                              style={{ fontSize: '0.8rem', padding: '6px', width: '100%', border: '1px solid var(--glass-border)', borderRadius: '6px', background: '#1e293b', color: '#fff' }}
                            >
                              {['LeetCode', 'GeeksForGeeks', 'HackerRank', 'CodeChef', 'Codeforces', 'TakeUForward', 'GitHub', 'Other'].map(plat => (
                                <option key={plat} value={plat} style={{ background: '#1e293b', color: '#fff' }}>{plat}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--foreground-muted)', marginBottom: '0.2rem' }}>
                              URL
                            </label>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="https://..."
                              value={profileUrl}
                              onChange={(e) => setProfileUrl(e.target.value)}
                              style={{ fontSize: '0.8rem', padding: '6px', width: '100%', border: '1px solid var(--glass-border)', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                            />
                          </div>

                          {profileError && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>
                              {profileError}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={handleSaveProfileLink}
                              disabled={profileSaving}
                              className="btn-primary"
                              style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Save
                            </button>
                            {editingProfileIdx !== null && (
                              <button
                                onClick={handleRemoveProfileLink}
                                disabled={profileSaving}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  color: 'var(--danger)',
                                  background: 'rgba(239, 68, 68, 0.05)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                Remove
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setIsAddingProfile(false);
                                setEditingProfileIdx(null);
                                setProfileError('');
                              }}
                              disabled={profileSaving}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        codingProfiles.length < 3 && (
                          <button
                            onClick={() => {
                              setIsAddingProfile(true);
                              setProfilePlatform('LeetCode');
                              setProfileUrl('');
                              setProfileError('');
                            }}
                            className="btn-primary"
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                          >
                            ➕ Add Profile Link
                          </button>
                        )
                      )}
                    </div>

                    {/* Change Password Compartment */}
                    <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔐 Change Password
                      </span>
                      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>
                            Current Password
                          </label>
                          <input
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            disabled={changePasswordSubmitting}
                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>
                            New Password
                          </label>
                          <input
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={changePasswordSubmitting}
                            minLength={6}
                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                            disabled={changePasswordSubmitting}
                            minLength={6}
                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          />
                        </div>

                        {changePasswordError && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', padding: '6px', borderRadius: '4px' }}>
                            {changePasswordError}
                          </div>
                        )}

                        {changePasswordSuccess && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', padding: '6px', borderRadius: '4px' }}>
                            {changePasswordSuccess}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={changePasswordSubmitting}
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          {changePasswordSubmitting ? 'Updating...' : 'Update Password'}
                        </button>
                      </form>
                    </div>

                    {/* Sign Out Account button */}
                    <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={handleSignOut}
                        className="btn-secondary"
                        style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                      >
                        Sign Out Account
                      </button>
                    </div>

                  </div>
                </section>

                {/* Right Cards Column */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
                  <div className="dashboard-top-row">
                    <StreakCard
                      streak={userProgress.streak}
                      userName={currentUser.name}
                      streakFreezes={userProgress.profile.streak_freezes}
                      onUseFreeze={handleUseFreeze}
                      activities={userProgress.activities}
                      freezeDates={userProgress.freezeDates}
                    />
                    <ActivityForm
                      userId={currentUser.id}
                      userName={currentUser.name}
                      onLogActivity={handleLogActivity}
                    />
                  </div>
                </section>
              </div>
            )}

            {/* 2. ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <Heatmap
                  activities={userProgress.activities}
                  userName={currentUser.name}
                  freezeDates={userProgress.freezeDates}
                />
                
                <BarGraph activities={userProgress.activities} />

                {/* Chronological Activity History log */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Activity Logs History 📜
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                      A chronological history of all your logged training accomplishments.
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(0,0,0,0.15)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--foreground-muted)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Category</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Problems</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Description/Notes</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Image Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProgress.activities.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--foreground-dark)' }}>
                              No study activities logged yet. Use the logging form on the Home tab!
                            </td>
                          </tr>
                        ) : (
                          [...userProgress.activities].sort((a,b) => b.date.localeCompare(a.date)).map(act => (
                            <tr key={act.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>
                                {new Date(act.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(14, 165, 233, 0.15)',
                                  border: '1px solid rgba(14, 165, 233, 0.2)',
                                  color: 'var(--primary)',
                                  fontWeight: 600
                                }}>
                                  {act.category}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                                {act.count}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--foreground-muted)' }}>
                                {act.notes || <em style={{ color: 'var(--foreground-dark)' }}>No notes provided</em>}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                {act.image_url ? (
                                  <a
                                    href={act.image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--primary)',
                                      background: 'rgba(14, 165, 233, 0.05)',
                                      border: '1px solid rgba(14, 165, 233, 0.25)',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      fontWeight: 500,
                                      display: 'inline-block',
                                      transition: 'var(--transition-smooth)'
                                    }}
                                  >
                                    🖼️ View Upload
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--foreground-dark)', fontSize: '0.75rem' }}>N/A</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CHALLENGES TAB */}
            {activeTab === 'challenges' && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    Active Challenges & Quizzes 🧠
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                    Test your knowledge! Answer correctly to earn points or streak freezes.
                  </p>
                </div>

                {quizzes.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--foreground-dark)', textAlign: 'center', padding: '1rem 0' }}>
                    No quiz questions published yet. Check back later!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {quizzes.map(quiz => {
                      const userSub = submissions.find(s => s.quiz_id === quiz.id);
                      const isAnswered = !!userSub;
                      const selectedOption = selectedAnswers[quiz.id] || '';
                      
                      return (
                        <div key={quiz.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                          <div className="quiz-card-header">
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                              {quiz.title}
                            </h3>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: quiz.reward_type === 'points' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                              border: quiz.reward_type === 'points' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
                              color: quiz.reward_type === 'points' ? 'var(--success)' : 'var(--primary)'
                            }}>
                              Reward: {quiz.reward_amount} {quiz.reward_type === 'points' ? 'Points' : 'Freezes ❄️'}
                            </span>
                          </div>

                          {quiz.description && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--foreground-muted)', marginBottom: '1rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                              {quiz.description}
                            </p>
                          )}

                          {/* Options list */}
                          <div className="quiz-options-grid">
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const optLabel = quiz[`option_${opt.toLowerCase()}` as keyof Quiz] as string;
                              const isSelected = selectedOption === opt;
                              const wasSelected = userSub?.selected_option === opt;
                              
                              let optStyle: React.CSSProperties = {
                                padding: '0.6rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(0,0,0,0.15)',
                                color: 'var(--foreground)',
                                fontSize: '0.8rem',
                                textAlign: 'left',
                                cursor: isAnswered ? 'default' : 'pointer',
                                transition: 'var(--transition-smooth)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              };

                              if (!isAnswered) {
                                  if (isSelected) {
                                    optStyle.borderColor = 'var(--primary)';
                                    optStyle.background = 'rgba(14, 165, 233, 0.12)';
                                  }
                              } else {
                                if (wasSelected) {
                                  optStyle.borderColor = userSub.is_correct ? 'var(--success)' : 'var(--danger)';
                                  optStyle.background = userSub.is_correct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                                  optStyle.fontWeight = '700';
                                } else if (quiz.correct_option === opt) {
                                  optStyle.borderColor = 'var(--success)';
                                  optStyle.background = 'rgba(16, 185, 129, 0.05)';
                                }
                              }

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={isAnswered}
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [quiz.id]: opt }))}
                                  style={optStyle}
                                  className="option-btn"
                                >
                                  <span style={{ fontWeight: 700, opacity: 0.6 }}>{opt}.</span>
                                  <span>{optLabel}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Answer status / Action button */}
                          {isAnswered ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              background: userSub.is_correct ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                              border: userSub.is_correct ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                              borderRadius: '8px',
                              padding: '0.6rem 1rem',
                            }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: userSub.is_correct ? 'var(--success)' : 'var(--danger)' }}>
                                {userSub.is_correct ? '🎉 Correct Answer!' : '❌ Incorrect Answer'}
                              </span>
                              {userSub.is_correct && userSub.reward_earned && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                                  Earned: <strong style={{ color: 'var(--success)' }}>{userSub.reward_earned}</strong>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <button
                                type="button"
                                disabled={!selectedOption || quizSubmitting[quiz.id]}
                                onClick={() => handleQuizSubmit(quiz.id)}
                                className="btn-primary"
                                style={{
                                  width: '100%',
                                  padding: '0.55rem',
                                  fontSize: '0.8rem',
                                  opacity: selectedOption ? 1 : 0.5
                                }}
                              >
                                {quizSubmitting[quiz.id] ? 'Submitting...' : 'Submit Answer'}
                              </button>
                              {quizErrors[quiz.id] && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', margin: '0.2rem 0 0 0', textAlign: 'center' }}>
                                  {quizErrors[quiz.id]}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                      Public Streaks Leaderboard 🏆
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                      See how you rank against other trainees!
                    </p>
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'rgba(14, 165, 233, 0.12)',
                    border: '1px solid rgba(14, 165, 233, 0.25)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem'
                  }}>
                    Your Rank: {
                      (() => {
                        const ranked = [...allProfiles]
                          .filter(p => !p.is_admin)
                          .sort((a, b) => {
                            const aStreak = a.current_streak ?? 0;
                            const bStreak = b.current_streak ?? 0;
                            if (bStreak !== aStreak) return bStreak - aStreak;
                            const aPoints = a.points ?? 0;
                            const bPoints = b.points ?? 0;
                            if (bPoints !== aPoints) return bPoints - aPoints;
                            return (a.name || '').localeCompare(b.name || '');
                          });
                        const idx = ranked.findIndex(p => p.id === currentUser?.id);
                        return idx !== -1 ? `#${idx + 1}` : 'N/A';
                      })()
                    }
                  </div>
                </div>

                <div className="leaderboard-desktop" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--foreground-muted)' }}>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '60px' }}>Rank</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Username</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Streak</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Best Streak</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const ranked = [...allProfiles]
                          .filter(p => !p.is_admin)
                          .sort((a, b) => {
                            const aStreak = a.current_streak ?? 0;
                            const bStreak = b.current_streak ?? 0;
                            if (bStreak !== aStreak) return bStreak - aStreak;
                            const aPoints = a.points ?? 0;
                            const bPoints = b.points ?? 0;
                            if (bPoints !== aPoints) return bPoints - aPoints;
                            return (a.name || '').localeCompare(b.name || '');
                          });

                        if (ranked.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-dark)' }}>
                                No trainees registered yet.
                              </td>
                            </tr>
                          );
                        }

                        return ranked.map((user, idx) => {
                          const isSelf = user.id === currentUser?.id;
                          const rankNum = idx + 1;
                          let rankDisplay = `#${rankNum}`;
                          if (rankNum === 1) rankDisplay = '🥇 #1';
                          else if (rankNum === 2) rankDisplay = '🥈 #2';
                          else if (rankNum === 3) rankDisplay = '🥉 #3';

                          return (
                            <tr
                              key={user.id}
                              style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                background: isSelf ? 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, transparent 100%)' : 'transparent',
                                borderLeft: isSelf ? '3px solid var(--primary)' : 'none',
                                fontWeight: isSelf ? 700 : 'normal',
                                color: isSelf ? '#fff' : 'var(--foreground)',
                              }}
                            >
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                                {rankDisplay}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={user.avatar_url || ''}
                                    alt={user.name}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  <span className="leaderboard-name-text">{user.name}</span>
                                  {isSelf && (
                                    <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', background: 'var(--primary)', color: '#fff', marginLeft: '2px' }}>
                                      You
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  background: user.streak_frozen ? 'rgba(56, 189, 248, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                                  color: user.streak_frozen ? 'var(--primary)' : 'var(--streak-start)',
                                  fontWeight: 700,
                                  fontSize: '0.8rem'
                                }}>
                                  {user.streak_frozen ? '❄️' : '🔥'} {user.current_streak ?? 0}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--success)' }}>
                                {user.longest_streak ?? 0}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                                {user.points ?? 0} ⭐
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Leaderboard */}
                <div className="leaderboard-mobile">
                  {(() => {
                    const ranked = [...allProfiles]
                      .filter(p => !p.is_admin)
                      .sort((a, b) => {
                        const aStreak = a.current_streak ?? 0;
                        const bStreak = b.current_streak ?? 0;
                        if (bStreak !== aStreak) return bStreak - aStreak;
                        const aPoints = a.points ?? 0;
                        const bPoints = b.points ?? 0;
                        if (bPoints !== aPoints) return bPoints - aPoints;
                        return (a.name || '').localeCompare(b.name || '');
                      });

                    if (ranked.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--foreground-dark)' }}>
                          No trainees registered yet.
                        </div>
                      );
                    }

                    return ranked.map((user, idx) => {
                      const isSelf = user.id === currentUser?.id;
                      const rankNum = idx + 1;
                      let rankDisplay = `#${rankNum}`;
                      if (rankNum === 1) rankDisplay = '🥇 #1';
                      else if (rankNum === 2) rankDisplay = '🥈 #2';
                      else if (rankNum === 3) rankDisplay = '🥉 #3';

                      return (
                        <div
                          key={user.id}
                          className="leaderboard-mobile-card"
                          style={{
                            borderLeft: isSelf ? '4px solid var(--primary)' : undefined,
                            background: isSelf ? 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)' : undefined,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground-muted)' }}>
                              {rankDisplay}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <img
                                src={user.avatar_url || ''}
                                alt={user.name}
                                style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <span className="leaderboard-name-text" style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelf ? 'var(--primary)' : '#fff' }}>
                                {user.name} {isSelf && '(You)'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <div>
                              <span style={{ color: 'var(--foreground-dark)' }}>Streak:</span>{' '}
                              <strong style={{ color: user.streak_frozen ? 'var(--primary)' : 'var(--streak-start)' }}>
                                {user.streak_frozen ? '❄' : '🔥'} {user.current_streak ?? 0}
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--foreground-dark)' }}>Best:</span>{' '}
                              <strong style={{ color: 'var(--success)' }}>{user.longest_streak ?? 0}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--foreground-dark)' }}>Points:</span>{' '}
                              <strong style={{ color: '#38bdf8' }}>{user.points ?? 0} ⭐</strong>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* 5. MESSAGES TAB (Dedicated User-Admin Chat log) */}
            {activeTab === 'messages' && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '500px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    Message Admin 🛡️
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                    Direct chat logs between you and the Consistency Club administrators.
                  </p>
                </div>

                {/* Chat Message Stream */}
                <div style={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  maxHeight: '350px',
                  overflowY: 'auto',
                }}>
                  {notifications.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--foreground-dark)', fontSize: '0.85rem' }}>
                      No chat messages. Type a message below to initiate contact with the administrator.
                    </div>
                  ) : (
                    [...notifications]
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map(msg => {
                        const isAdminMsg = msg.from_admin;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignSelf: isAdminMsg ? 'flex-start' : 'flex-end',
                              maxWidth: '75%',
                              gap: '2px'
                            }}
                          >
                            <div style={{
                              fontSize: '0.65rem',
                              color: 'var(--foreground-dark)',
                              textAlign: isAdminMsg ? 'left' : 'right',
                              padding: '0 4px'
                            }}>
                              {isAdminMsg ? 'Club Admin' : 'You'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{
                              background: isAdminMsg ? 'rgba(255, 255, 255, 0.06)' : 'rgba(14, 165, 233, 0.15)',
                              border: isAdminMsg ? '1px solid var(--glass-border)' : '1px solid rgba(14, 165, 233, 0.3)',
                              padding: '0.6rem 0.9rem',
                              borderRadius: isAdminMsg ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                              color: '#fff',
                              fontSize: '0.85rem',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Message input bar */}
                <form onSubmit={handleSendMessageToAdmin} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <textarea
                    className="input-field"
                    placeholder="Type a message to the administrator..."
                    value={adminMessageText}
                    onChange={(e) => setAdminMessageText(e.target.value)}
                    maxLength={300}
                    required
                    style={{
                      flexGrow: 1,
                      minHeight: '44px',
                      height: '44px',
                      fontSize: '0.85rem',
                      padding: '0.6rem 0.75rem',
                      resize: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (adminMessageText.trim() && !adminMessageSending) {
                          handleSendMessageToAdmin(e);
                        }
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={adminMessageSending || !adminMessageText.trim()}
                    className="btn-primary"
                    style={{
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.85rem',
                      height: '44px',
                      opacity: adminMessageText.trim() ? 1 : 0.5,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {adminMessageSending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>

                {adminMessageSuccess && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.06)', padding: '6px', borderRadius: '4px' }}>
                    {adminMessageSuccess}
                  </div>
                )}
                {adminMessageError && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', textAlign: 'center', background: 'rgba(239, 68, 68, 0.06)', padding: '6px', borderRadius: '4px' }}>
                    {adminMessageError}
                  </div>
                )}
              </div>
            )}

            {/* 6. NOTIFICATIONS TAB (Notification Center) */}
            {activeTab === 'notifications' && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                      Notification Center 🔔
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                      Updates and system announcements sent by Consistency Club administrators.
                    </p>
                  </div>
                  {notifications.filter(n => !n.is_read && n.from_admin).length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                    >
                      ✓ Mark all as read
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(() => {
                    const adminNotifs = notifications.filter(n => n.from_admin);
                    if (adminNotifs.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--foreground-dark)', fontSize: '0.85rem' }}>
                          No notifications or announcements found.
                        </div>
                      );
                    }
                    return adminNotifs.map(notif => (
                      <div
                        key={notif.id}
                        className="notification-center-card"
                        style={{
                          background: notif.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(14, 165, 233, 0.04)',
                          border: notif.is_read ? '1px solid var(--glass-border)' : '1px solid rgba(14, 165, 233, 0.2)',
                          borderRadius: '8px',
                          padding: '1rem',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', color: notif.is_read ? 'var(--foreground-muted)' : '#fff', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--foreground-dark)' }}>
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                        </div>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--primary)',
                              background: 'rgba(14, 165, 233, 0.08)',
                              border: '1px solid rgba(14, 165, 233, 0.25)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              transition: 'var(--transition-smooth)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)'}
                          >
                            ✓ Mark read
                          </button>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '1.5rem 2rem',
        marginTop: 'auto',
        fontSize: '0.8rem',
        color: 'var(--foreground-muted)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p>
            Developed with **Next.js**, **Vanilla CSS**, and **Supabase**.
          </p>
          {!isSupabase && (
            <p style={{ color: 'var(--foreground-dark)' }}>
              Tip: Connect your Supabase instance to enable authenticated cloud sync.
            </p>
          )}
        </div>
      </footer>

      {/* Mobile Navigation Drawer */}
      {currentUser && (
        <>
          <div
            className={`mobile-drawer-overlay ${isMobileDrawerOpen ? 'open' : ''}`}
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className={`mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}>
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>ASCEND</span>
              </div>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              {[
                { id: 'home', label: 'Home', icon: '🏠' },
                { id: 'activity', label: 'Activity', icon: '📈' },
                { id: 'challenges', label: 'Challenges', icon: '🧠' },
                { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
                { id: 'messages', label: 'Messages', icon: '💬' },
                { id: 'notifications', label: 'Notifications', icon: '🔔' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileDrawerOpen(false);
                    }}
                    style={{
                      background: isActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                      border: 'none',
                      color: isActive ? 'var(--primary)' : 'var(--foreground-muted)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      minHeight: '44px' // Touch target
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.id === 'challenges' && unseenQuizCount > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 'auto',
                        lineHeight: 1
                      }}>
                        {unseenQuizCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}

    </div>
  );
}

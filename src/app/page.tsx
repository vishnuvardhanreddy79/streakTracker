'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, UserProgress } from '../types';
import {
  getUserProgress,
  logActivity,
  checkSupabaseStatus,
  getSessionProfile,
  logoutUser,
  consumeStreakFreeze,
  updateProfileAvatar,
  uploadWorkImage,
} from '../lib/db';
import StreakCard from '../components/StreakCard';
import Heatmap from '../components/Heatmap';
import BarGraph from '../components/BarGraph';
import ActivityForm from '../components/ActivityForm';
import NotificationBell from '../components/NotificationBell';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isSupabase, setIsSupabase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState('');

  // Fetch progress for logged-in user
  const loadUserProgress = useCallback(async (userId: string) => {
    try {
      const progress = await getUserProgress(userId);
      setUserProgress(progress);
    } catch (err) {
      setDbError('Error loading progress details from database');
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
      await loadUserProgress(profile.id);
      setLoading(false);
    }
    init();
  }, [router, loadUserProgress]);

  const handleLogActivity = useCallback(async (
    date: string,
    count: number,
    category: string,
    notes: string | null,
    imageUrl: string | null
  ) => {
    if (!currentUser) return;
    await logActivity(currentUser.id, date, count, category, notes, imageUrl);
    await loadUserProgress(currentUser.id);
  }, [currentUser, loadUserProgress]);

  const handleUseFreeze = useCallback(async () => {
    if (!currentUser) return;
    await consumeStreakFreeze(currentUser.id);
    await loadUserProgress(currentUser.id);
  }, [currentUser, loadUserProgress]);

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

  const handleSignOut = useCallback(async () => {
    await logoutUser();
    router.push('/login');
  }, [router]);

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
      <header className="main-header">
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
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              AETHER <span style={{ fontWeight: 300, color: 'var(--foreground-muted)' }}>TRACK</span>
            </h1>
          </div>
        </div>

        {/* Right side: Notification Bell, DB Status Badge & Admin Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser && <NotificationBell userId={currentUser.id} />}

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
              Connected
            </div>
          ) : (
            <div className="status-badge status-badge--offline" title="Offline local storage simulation mode active">
              <span className="status-dot status-dot--offline" />
              Offline
            </div>
          )}
        </div>
      </header>

      {/* Main Grid Body */}
      <main className="main-content-grid" style={{
        flexGrow: 1,
        padding: '2rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '2rem'
      }}>
        
        {/* Left Column - User Profile Info */}
        <section style={{ height: 'fit-content' }}>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
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
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{currentUser?.name}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>{currentUser?.email}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
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
                <span>{avatarUploading ? '⏳ Uploading...' : '📷 Update DP'}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                  style={{ display: 'none' }}
                />
              </label>
              {avatarError && (
                <span style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '4px' }}>
                  {avatarError}
                </span>
              )}
            </div>

            <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', textAlign: 'left', color: 'var(--foreground-muted)', paddingTop: '1.25rem' }}>
              <div>
                Joined:{' '}
                <strong style={{ color: 'var(--foreground)' }}>
                  {currentUser ? new Date(currentUser.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ''}
                </strong>
              </div>
              <div>
                Trainee ID:{' '}
                <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px', color: 'var(--primary)', wordBreak: 'break-all' }}>
                  {currentUser?.id}
                </code>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
            >
              Sign Out Account
            </button>
          </div>
        </section>

        {/* Right Column - User Dashboard Details */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
          
          {dbError && (
            <div style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              fontSize: '0.85rem'
            }}>
              {dbError}
            </div>
          )}

          {userProgress && currentUser && (
            <>
              {/* Row 1: Streak Card & Add Progress Side-by-Side */}
              <div className="dashboard-top-row" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>
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

              {/* Row 2: Heatmap Visualizer */}
              <Heatmap
                activities={userProgress.activities}
                userName={currentUser.name}
                freezeDates={userProgress.freezeDates}
              />

              {/* Row 3: BarGraph breakdown */}
              <BarGraph activities={userProgress.activities} />
            </>
          )}

        </section>
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
    </div>
  );
}

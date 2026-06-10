'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSessionProfile,
  getAdminDashboardData,
  logoutUser,
  adminIncreaseStreak,
  adminDecreaseStreak,
  adminRemoveStreak,
  adminSendNotification,
  adminToggleFreezeStreak,
} from '../../lib/db';
import { Profile, Streak, Activity } from '../../types';

type TraineeWithStreak = Profile & { streak: Streak };
type SubmissionWithUser = Activity & { userName: string; avatarUrl: string | null };

export default function AdminDashboard() {
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [trainees, setTrainees] = useState<TraineeWithStreak[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Admin action states
  const [actionLoading, setActionLoading] = useState<string | null>(null); // userId being acted on
  const [confirmReset, setConfirmReset] = useState<string | null>(null); // userId awaiting reset confirmation
  const [streakDays, setStreakDays] = useState<Record<string, number>>({}); // per-user day input

  // Notification composer state
  const [notifTarget, setNotifTarget] = useState<string | null>(null); // userId
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await getAdminDashboardData();
      setTrainees(data.trainees);
      setSubmissions(data.submissions);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, []);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const profile = await getSessionProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      if (!profile.is_admin) {
        router.push('/');
        return;
      }
      setAdminProfile(profile);
      await loadData();
      setLoading(false);
    }
    checkAdminAndLoad();
  }, [router, loadData]);

  const handleSignOut = useCallback(async () => {
    await logoutUser();
    router.push('/login');
  }, [router]);

  const handleIncreaseStreak = useCallback(async (userId: string) => {
    const days = streakDays[userId] || 1;
    setActionLoading(userId);
    try {
      await adminIncreaseStreak(userId, days);
      await loadData();
    } catch (err) {
      console.error('Error increasing streak:', err);
    } finally {
      setActionLoading(null);
    }
  }, [streakDays, loadData]);

  const handleDecreaseStreak = useCallback(async (userId: string) => {
    const days = streakDays[userId] || 1;
    setActionLoading(userId);
    try {
      await adminDecreaseStreak(userId, days);
      await loadData();
    } catch (err) {
      console.error('Error decreasing streak:', err);
    } finally {
      setActionLoading(null);
    }
  }, [streakDays, loadData]);

  const handleRemoveStreak = useCallback(async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminRemoveStreak(userId);
      await loadData();
    } catch (err) {
      console.error('Error removing streak:', err);
    } finally {
      setActionLoading(null);
      setConfirmReset(null);
    }
  }, [loadData]);

  const handleToggleFreeze = useCallback(async (userId: string, currentFrozen: boolean) => {
    setActionLoading(userId);
    try {
      await adminToggleFreezeStreak(userId, !currentFrozen);
      await loadData();
    } catch (err) {
      console.error('Error toggling freeze streak:', err);
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleSendNotification = useCallback(async () => {
    if (!notifTarget || !notifMessage.trim()) return;
    setNotifSending(true);
    try {
      await adminSendNotification(notifTarget, notifMessage.trim());
      const user = trainees.find(t => t.id === notifTarget);
      setNotifSuccess(`Notification sent to ${user?.name || 'user'}!`);
      setNotifMessage('');
      setNotifTarget(null);
      setTimeout(() => setNotifSuccess(''), 3000);
    } catch (err) {
      console.error('Error sending notification:', err);
    } finally {
      setNotifSending(false);
    }
  }, [notifTarget, notifMessage, trainees]);

  const updateDays = useCallback((userId: string, val: number) => {
    setStreakDays(prev => ({ ...prev, [userId]: Math.max(1, val) }));
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(14, 165, 233, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--foreground-muted)', fontWeight: 500 }}>Loading administrative data...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              AETHER <span style={{ fontWeight: 300, color: 'var(--foreground-muted)' }}>ADMIN</span>
            </h1>
          </div>
        </div>

        {/* Admin profile and signout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            ← Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={adminProfile?.avatar_url || ''}
              alt="Admin"
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{adminProfile?.name}</span>
          </div>
          <button onClick={handleSignOut} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-grid" style={{
        flexGrow: 1,
        padding: '2rem',
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem'
      }}>

        {/* Left Column: Streaks Leaderboard + Admin Powers */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          <div className="glass-panel" style={{ height: '100%' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
              Trainee Streak Leaderboard
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginBottom: '1.5rem' }}>
              Manage streaks, send notifications, and monitor all registered users.
            </p>

            {/* Notification Success Banner */}
            {notifSuccess && (
              <div className="animate-fade-in" style={{
                fontSize: '0.8rem',
                color: 'var(--success)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {notifSuccess}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--foreground-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>User</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Streak</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Best</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trainees.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--foreground-dark)' }}>
                        No trainee profiles registered yet.
                      </td>
                    </tr>
                  ) : (
                    trainees.map(user => (
                      <React.Fragment key={user.id}>
                        <tr
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                            transition: 'background 0.2s',
                            opacity: actionLoading === user.id ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={user.avatar_url || ''}
                                alt={user.name}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dark)' }}>{user.email || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            {user.streak.currentStreak > 0 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: user.streak.isFrozen ? 'rgba(56, 189, 248, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                                border: user.streak.isFrozen ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(249, 115, 22, 0.25)',
                                color: user.streak.isFrozen ? 'var(--primary)' : 'var(--streak-start)',
                                fontWeight: 700
                              }}>
                                {user.streak.isFrozen ? '❄️' : '🔥'} {user.streak.currentStreak}
                              </span>
                            ) : (
                              user.streak.isFrozen ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  color: 'var(--primary)',
                                  fontWeight: 700
                                }}>
                                  ❄️ 0
                                </span>
                              ) : (
                                <span style={{ color: 'var(--foreground-dark)' }}>0</span>
                              )
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>
                            {user.streak.longestStreak}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {/* Days input */}
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={streakDays[user.id] || 1}
                                onChange={(e) => updateDays(user.id, parseInt(e.target.value) || 1)}
                                style={{
                                  width: '42px',
                                  padding: '3px 4px',
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '4px',
                                  color: 'var(--foreground)',
                                  fontSize: '0.75rem',
                                  textAlign: 'center',
                                  fontFamily: 'var(--font-sans)',
                                }}
                                title="Number of days to adjust"
                              />
                              <button
                                onClick={() => handleIncreaseStreak(user.id)}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--success"
                                title="Increase streak"
                              >
                                ➕
                              </button>
                              <button
                                onClick={() => handleDecreaseStreak(user.id)}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--warning"
                                title="Decrease streak"
                              >
                                ➖
                              </button>
                              <button
                                onClick={() => handleToggleFreeze(user.id, !!user.streak.isFrozen)}
                                disabled={actionLoading === user.id}
                                className={`admin-action-btn`}
                                style={{
                                  background: user.streak.isFrozen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                  border: user.streak.isFrozen ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                }}
                                title={user.streak.isFrozen ? "Unfreeze streak" : "Freeze streak"}
                              >
                                {user.streak.isFrozen ? '❄️' : '🔥'}
                              </button>
                              <button
                                onClick={() => setConfirmReset(user.id)}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--danger"
                                title="Reset all streaks"
                              >
                                🗑️
                              </button>
                              <button
                                onClick={() => setNotifTarget(notifTarget === user.id ? null : user.id)}
                                className="admin-action-btn admin-action-btn--primary"
                                title="Send notification"
                              >
                                📩
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Reset Confirmation Row */}
                        {confirmReset === user.id && (
                          <tr>
                            <td colSpan={4} style={{ padding: '0.5rem' }}>
                              <div className="animate-fade-in" style={{
                                background: 'rgba(239, 68, 68, 0.06)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                              }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                                  ⚠️ Reset ALL activity data for {user.name}? This cannot be undone.
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => handleRemoveStreak(user.id)}
                                    style={{
                                      padding: '4px 12px',
                                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: '#fff',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Confirm Reset
                                  </button>
                                  <button
                                    onClick={() => setConfirmReset(null)}
                                    className="btn-secondary"
                                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Notification Composer Row */}
                        {notifTarget === user.id && (
                          <tr>
                            <td colSpan={4} style={{ padding: '0.5rem' }}>
                              <div className="animate-fade-in" style={{
                                background: 'rgba(14, 165, 233, 0.04)',
                                border: '1px solid rgba(14, 165, 233, 0.15)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                              }}>
                                <svg width="16" height="16" fill="none" stroke="var(--primary)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder={`Message to ${user.name}...`}
                                  value={notifMessage}
                                  onChange={(e) => setNotifMessage(e.target.value)}
                                  maxLength={200}
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSendNotification();
                                  }}
                                />
                                <button
                                  onClick={handleSendNotification}
                                  disabled={notifSending || !notifMessage.trim()}
                                  className="btn-primary"
                                  style={{
                                    padding: '0.45rem 0.8rem',
                                    fontSize: '0.75rem',
                                    whiteSpace: 'nowrap',
                                    opacity: notifMessage.trim() ? 1 : 0.5,
                                  }}
                                >
                                  {notifSending ? 'Sending...' : 'Send'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right Column: Work Submissions Feed */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
              Work Submission Screen Feeds
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginBottom: '1.5rem' }}>
              JPG uploads from trainees showing evidence of daily task accomplishments.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flexGrow: 1, maxHeight: '600px', paddingRight: '4px' }}>
              {submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--foreground-dark)', flexGrow: 1 }} className="flex-center">
                  No JPG work uploads found.
                </div>
              ) : (
                submissions.map(sub => (
                  <div
                    key={sub.id}
                    className="glass-panel"
                    style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Header profile details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sub.avatarUrl || ''}
                          alt={sub.userName}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sub.userName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>
                            {new Date(sub.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(14, 165, 233, 0.12)',
                        border: '1px solid rgba(14, 165, 233, 0.2)',
                        color: 'var(--primary)',
                        fontWeight: 600
                      }}>
                        {sub.category}
                      </span>
                    </div>

                    {/* Notes detail */}
                    {sub.notes && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', background: 'rgba(0,0,0,0.1)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        {sub.notes}
                      </p>
                    )}

                    {/* Image visual */}
                    {sub.image_url && (
                      <div
                        onClick={() => setLightboxImage(sub.image_url)}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '150px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sub.image_url}
                          alt="Work screenshot"
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                          padding: '0.5rem',
                          textAlign: 'center',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          Click to View Full JPG Screen
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Overlay Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="flex-center animate-fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 7, 13, 0.9)',
            zIndex: 999,
            padding: '2rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: '#fff', fontSize: '1.5rem', fontWeight: 600 }}>
            ✕ Close
          </div>
          <div style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Screenshot Zoomed"
              style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', cursor: 'default' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

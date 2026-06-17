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
  adminSendNotificationToAll,
  getAdminMessages,
  adminToggleFreezeStreak,
  adminAdjustStreakFreezes,
  adminAdjustPoints,
  getPointsPerProblem,
  updatePointsPerProblem,
  getQuizzes,
  addQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizSubmissionsForAdmin,
} from '../../lib/db';
import { Profile, Streak, Activity, Notification, Quiz, QuizSubmission } from '../../types';

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
  const [notifTarget, setNotifTarget] = useState<string | null>(null); // userId or 'all'
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [adminMessages, setAdminMessages] = useState<(Notification & { user_name: string })[]>([]);

  // Points & Quizzes states
  const [pointsMultiplier, setPointsMultiplier] = useState<number>(10);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizOptA, setQuizOptA] = useState('');
  const [quizOptB, setQuizOptB] = useState('');
  const [quizOptC, setQuizOptC] = useState('');
  const [quizOptD, setQuizOptD] = useState('');
  const [quizCorrectOpt, setQuizCorrectOpt] = useState('A');
  const [quizRewardType, setQuizRewardType] = useState('points');
  const [quizRewardAmount, setQuizRewardAmount] = useState(50);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState('');
  const [quizSubmitSuccess, setQuizSubmitSuccess] = useState('');

  // Analytics states
  const [allSubmissions, setAllSubmissions] = useState<(QuizSubmission & { user_name: string; quiz_title: string; correct_option: string })[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getAdminDashboardData();
      setTrainees(data.trainees);
      setSubmissions(data.submissions);
      
      const messages = await getAdminMessages();
      setAdminMessages(messages);

      const mult = await getPointsPerProblem();
      setPointsMultiplier(mult);

      const quizList = await getQuizzes();
      setQuizzes(quizList);

      const subList = await getQuizSubmissionsForAdmin();
      setAllSubmissions(subList);
      if (quizList.length > 0 && !selectedQuizId) {
        setSelectedQuizId(quizList[0].id);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, [selectedQuizId]);

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

  const handleAdjustFreezes = useCallback(async (userId: string, amount: number) => {
    setActionLoading(userId);
    try {
      await adminAdjustStreakFreezes(userId, amount);
      await loadData();
    } catch (err) {
      console.error('Error adjusting streak freezes:', err);
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleSendNotification = useCallback(async () => {
    if (!notifTarget || !notifMessage.trim()) return;
    setNotifSending(true);
    try {
      if (notifTarget === 'all') {
        await adminSendNotificationToAll(notifMessage.trim());
        setNotifSuccess('Broadcast notification sent to all trainees!');
      } else {
        await adminSendNotification(notifTarget, notifMessage.trim());
        const user = trainees.find(t => t.id === notifTarget);
        setNotifSuccess(`Notification sent to ${user?.name || 'user'}!`);
      }
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

  const handleAdjustPoints = useCallback(async (userId: string, isAdd: boolean) => {
    const rawVal = streakDays[userId] || 1;
    const amount = isAdd ? rawVal : -rawVal;
    setActionLoading(userId);
    try {
      await adminAdjustPoints(userId, amount);
      await loadData();
    } catch (err) {
      console.error('Error adjusting points:', err);
    } finally {
      setActionLoading(null);
    }
  }, [streakDays, loadData]);

  const handleUpdateMultiplier = useCallback(async () => {
    try {
      await updatePointsPerProblem(pointsMultiplier);
      alert('Points multiplier updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update multiplier');
    }
  }, [pointsMultiplier]);

  const handleSaveQuiz = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizSubmitError('');
    setQuizSubmitSuccess('');

    if (!quizTitle.trim() || !quizOptA.trim() || !quizOptB.trim() || !quizOptC.trim() || !quizOptD.trim()) {
      setQuizSubmitError('Title and options A, B, C, D are required.');
      return;
    }

    try {
      const quizPayload = {
        title: quizTitle.trim(),
        description: quizDescription.trim() || null,
        option_a: quizOptA.trim(),
        option_b: quizOptB.trim(),
        option_c: quizOptC.trim(),
        option_d: quizOptD.trim(),
        correct_option: quizCorrectOpt,
        reward_type: quizRewardType,
        reward_amount: quizRewardAmount,
      };

      if (editingQuizId) {
        await updateQuiz(editingQuizId, quizPayload);
        setQuizSubmitSuccess('Quiz question updated successfully!');
      } else {
        await addQuiz(quizPayload);
        setQuizSubmitSuccess('Quiz question created successfully!');
      }

      // Reset form
      setQuizTitle('');
      setQuizDescription('');
      setQuizOptA('');
      setQuizOptB('');
      setQuizOptC('');
      setQuizOptD('');
      setQuizCorrectOpt('A');
      setQuizRewardType('points');
      setQuizRewardAmount(50);
      setEditingQuizId(null);

      // Reload
      const quizList = await getQuizzes();
      setQuizzes(quizList);
    } catch (err: any) {
      console.error(err);
      setQuizSubmitError(err.message || 'Error saving quiz question.');
    }
  }, [
    editingQuizId,
    quizTitle,
    quizDescription,
    quizOptA,
    quizOptB,
    quizOptC,
    quizOptD,
    quizCorrectOpt,
    quizRewardType,
    quizRewardAmount,
  ]);

  const handleEditQuizClick = useCallback((quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || '');
    setQuizOptA(quiz.option_a);
    setQuizOptB(quiz.option_b);
    setQuizOptC(quiz.option_c);
    setQuizOptD(quiz.option_d);
    setQuizCorrectOpt(quiz.correct_option);
    setQuizRewardType(quiz.reward_type);
    setQuizRewardAmount(quiz.reward_amount);
  }, []);

  const handleDeleteQuiz = useCallback(async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz question?')) return;
    try {
      await deleteQuiz(quizId);
      const quizList = await getQuizzes();
      setQuizzes(quizList);
    } catch (err) {
      console.error('Error deleting quiz:', err);
    }
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
            <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginBottom: '1rem' }}>
              Manage streaks, send notifications, and monitor all registered users.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setNotifTarget(notifTarget === 'all' ? null : 'all')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: notifTarget === 'all' ? 'rgba(14, 165, 233, 0.12)' : undefined,
                  border: notifTarget === 'all' ? '1px solid var(--primary)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📢 Broadcast to All Trainees</span>
              </button>
            </div>

            {notifTarget === 'all' && (
              <div className="animate-fade-in" style={{
                background: 'rgba(14, 165, 233, 0.04)',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}>
                <svg width="16" height="16" fill="none" stroke="var(--primary)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Broadcast message to all trainees..."
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
                  {notifSending ? 'Broadcasting...' : 'Broadcast'}
                </button>
              </div>
            )}

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
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Freezes ❄️</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Points ⭐</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trainees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--foreground-dark)' }}>
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
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: '#38bdf8' }}>
                            {user.streak_freezes ?? 0}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                            {user.points ?? 0} ⭐
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
                                onClick={() => handleAdjustFreezes(user.id, streakDays[user.id] || 1)}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--primary"
                                title="Grant freezes"
                                style={{ color: '#38bdf8' }}
                              >
                                ❄️➕
                              </button>
                              <button
                                onClick={() => handleAdjustFreezes(user.id, -(streakDays[user.id] || 1))}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--warning"
                                title="Deduct freezes"
                                style={{ color: '#38bdf8' }}
                              >
                                ❄️➖
                              </button>
                              <button
                                onClick={() => handleAdjustPoints(user.id, true)}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--success"
                                title="Grant points"
                              >
                                ⭐➕
                              </button>
                              <button
                                onClick={() => handleAdjustPoints(user.id, false)}
                                disabled={actionLoading === user.id}
                                className="admin-action-btn admin-action-btn--warning"
                                title="Deduct points"
                              >
                                ⭐➖
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
                            <td colSpan={6} style={{ padding: '0.5rem' }}>
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
                            <td colSpan={6} style={{ padding: '0.5rem' }}>
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

          {/* Points Configuration Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
              Global Points Configuration ⚙️
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', margin: 0 }}>
              Adjust the multiplier determining how many points are awarded per study problem logged.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexGrow: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                  Points Per Problem Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input-field"
                  value={pointsMultiplier}
                  onChange={(e) => setPointsMultiplier(parseInt(e.target.value) || 10)}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>
              <button
                type="button"
                onClick={handleUpdateMultiplier}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', alignSelf: 'flex-end' }}
              >
                Save Setting
              </button>
            </div>
          </div>

          {/* Quiz / Challenge Manager Builder */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                Quiz & Challenge Builder 🧠
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                {editingQuizId ? 'Edit quiz question options and correct answer.' : 'Create multiple choice quiz challenges with automated rewards.'}
              </p>
            </div>

            <form onSubmit={handleSaveQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Question Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Dynamic Programming basics"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  required
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Description / Code Snippet</label>
                <textarea
                  className="input-field"
                  placeholder="e.g. What is the time complexity of the fibonacci memoized lookup?"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  style={{ minHeight: '60px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Option A</label>
                  <input
                    type="text"
                    className="input-field"
                    value={quizOptA}
                    onChange={(e) => setQuizOptA(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Option B</label>
                  <input
                    type="text"
                    className="input-field"
                    value={quizOptB}
                    onChange={(e) => setQuizOptB(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Option C</label>
                  <input
                    type="text"
                    className="input-field"
                    value={quizOptC}
                    onChange={(e) => setQuizOptC(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Option D</label>
                  <input
                    type="text"
                    className="input-field"
                    value={quizOptD}
                    onChange={(e) => setQuizOptD(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Answer & Reward configs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Correct Option</label>
                  <select
                    className="input-field"
                    value={quizCorrectOpt}
                    onChange={(e) => setQuizCorrectOpt(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', background: '#0f172a', color: '#fff' }}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Reward Type</label>
                  <select
                    className="input-field"
                    value={quizRewardType}
                    onChange={(e) => setQuizRewardType(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', background: '#0f172a', color: '#fff' }}
                  >
                    <option value="points">Points ⭐</option>
                    <option value="freeze">Streak Freeze ❄️</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Reward Amount</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="input-field"
                    value={quizRewardAmount}
                    onChange={(e) => setQuizRewardAmount(parseInt(e.target.value) || 50)}
                    required
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flexGrow: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                >
                  {editingQuizId ? 'Update Challenge' : 'Publish Challenge'}
                </button>
                {editingQuizId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuizId(null);
                      setQuizTitle('');
                      setQuizDescription('');
                      setQuizOptA('');
                      setQuizOptB('');
                      setQuizOptC('');
                      setQuizOptD('');
                      setQuizCorrectOpt('A');
                      setQuizRewardType('points');
                      setQuizRewardAmount(50);
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.6rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {quizSubmitSuccess && (
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.06)', padding: '4px', borderRadius: '4px' }}>
                  {quizSubmitSuccess}
                </div>
              )}
              {quizSubmitError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--danger)', textAlign: 'center', background: 'rgba(239, 68, 68, 0.06)', padding: '4px', borderRadius: '4px' }}>
                  {quizSubmitError}
                </div>
              )}
            </form>

            {/* List of active quizzes for editing/deleting */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Active Challenges (Last 24 Hours)
              </h3>
              {(() => {
                const active = quizzes.filter(q => Date.now() < new Date(q.created_at).getTime() + 24 * 60 * 60 * 1000);
                if (active.length === 0) {
                  return <p style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)', marginBottom: '1rem' }}>No active challenges.</p>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem' }}>
                    {active.map(q => (
                      <div key={q.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: selectedQuizId === q.id ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.04)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: selectedQuizId === q.id ? '1px solid var(--primary)' : '1px solid rgba(14, 165, 233, 0.15)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, paddingRight: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {q.title}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>
                            Reward: {q.reward_amount} {q.reward_type} (Ans: {q.correct_option})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditQuizClick(q)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="Edit question"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(q.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="Delete question"
                          >
                            🗑️
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedQuizId(q.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="View Analytics"
                          >
                            📊
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Quiz History (Expired Quizzes) */}
            <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.5rem' }}>
                Quiz History (Expired Quizzes)
              </h3>
              {(() => {
                const expired = quizzes.filter(q => Date.now() >= new Date(q.created_at).getTime() + 24 * 60 * 60 * 1000);
                if (expired.length === 0) {
                  return <p style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)' }}>No expired quizzes in history.</p>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                    {expired.map(q => (
                      <div key={q.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: selectedQuizId === q.id ? 'rgba(14, 165, 233, 0.08)' : 'rgba(255,255,255,0.01)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: selectedQuizId === q.id ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, paddingRight: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {q.title}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--foreground-dark)' }}>
                            Expired 24h+ ago (Ans: {q.correct_option})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(q.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="Delete question"
                          >
                            🗑️
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedQuizId(q.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="View Analytics"
                          >
                            📊
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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

          {/* Inbox Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5rem', maxHeight: '400px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
              Trainee Messages Inbox 📩
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginBottom: '1.25rem' }}>
              Direct messages sent from trainees to the administrator.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
              {adminMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--foreground-dark)', flexGrow: 1 }} className="flex-center">
                  No messages from trainees.
                </div>
              ) : (
                adminMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                        {msg.user_name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-dark)' }}>
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quiz Analytics & Answer Details Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5rem', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                Quiz Analytics & Submissions 📊
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                Select a quiz challenge from the left builder panel to analyze trainee responses and performance.
              </p>
            </div>

            {(() => {
              const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
              if (!selectedQuiz) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--foreground-dark)' }}>
                    No quiz selected or available. Click the 📊 icon on any quiz in the builder panel.
                  </div>
                );
              }

              const quizSubs = allSubmissions.filter(s => s.quiz_id === selectedQuizId);
              const totalAnswered = quizSubs.length;
              const totalCorrect = quizSubs.filter(s => s.is_correct).length;
              const totalIncorrect = totalAnswered - totalCorrect;
              const correctPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
              const incorrectPct = totalAnswered > 0 ? Math.round((totalIncorrect / totalAnswered) * 100) : 0;

              // Option distribution
              const countA = quizSubs.filter(s => s.selected_option === 'A').length;
              const countB = quizSubs.filter(s => s.selected_option === 'B').length;
              const countC = quizSubs.filter(s => s.selected_option === 'C').length;
              const countD = quizSubs.filter(s => s.selected_option === 'D').length;

              const pctA = totalAnswered > 0 ? Math.round((countA / totalAnswered) * 100) : 0;
              const pctB = totalAnswered > 0 ? Math.round((countB / totalAnswered) * 100) : 0;
              const pctC = totalAnswered > 0 ? Math.round((countC / totalAnswered) * 100) : 0;
              const pctD = totalAnswered > 0 ? Math.round((countD / totalAnswered) * 100) : 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Selected Quiz Title info */}
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                      {selectedQuiz.title}
                    </h3>
                    {selectedQuiz.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                        {selectedQuiz.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--foreground-dark)' }}>
                      <span>Correct Answer: <strong style={{ color: 'var(--success)' }}>Option {selectedQuiz.correct_option}</strong></span>
                      <span>•</span>
                      <span>Reward: {selectedQuiz.reward_amount} {selectedQuiz.reward_type === 'points' ? 'Points ⭐' : 'Freezes ❄️'}</span>
                    </div>
                  </div>

                  {/* Stat cards & charts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Correct vs Incorrect Donut Chart */}
                    <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '1rem', background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', margin: 0 }}>Correct vs Incorrect</h4>
                      
                      <div style={{
                        position: 'relative',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: totalAnswered > 0 
                          ? `conic-gradient(var(--success) 0% ${correctPct}%, var(--danger) ${correctPct}% 100%)`
                          : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }}>
                        {/* Inner cutout for donut */}
                        <div style={{
                          position: 'absolute',
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: '#0b0f19', // Matches aether glass main theme panel background
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{totalAnswered}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Answers</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', width: '100%', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                            <span style={{ color: 'var(--foreground-muted)' }}>Correct</span>
                          </div>
                          <strong style={{ color: 'var(--success)' }}>{correctPct}% ({totalCorrect})</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }} />
                            <span style={{ color: 'var(--foreground-muted)' }}>Incorrect</span>
                          </div>
                          <strong style={{ color: 'var(--danger)' }}>{incorrectPct}% ({totalIncorrect})</strong>
                        </div>
                      </div>
                    </div>

                    {/* Answer Distribution Donut Chart */}
                    <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '1rem', background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', margin: 0 }}>Answer Distribution</h4>
                      
                      <div style={{
                        position: 'relative',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: totalAnswered > 0 
                          ? `conic-gradient(#38bdf8 0% ${pctA}%, #a855f7 ${pctA}% ${pctA + pctB}%, #f59e0b ${pctA + pctB}% ${pctA + pctB + pctC}%, #ec4899 ${pctA + pctB + pctC}% 100%)`
                          : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }}>
                        {/* Inner cutout for donut */}
                        <div style={{
                          position: 'absolute',
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: '#0b0f19',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>Options</span>
                        </div>
                      </div>

                      {/* Legend grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.75rem', fontSize: '0.7rem', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#38bdf8', borderRadius: '2px' }} />
                            <span style={{ color: 'var(--foreground-muted)' }}>A</span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>{pctA}% ({countA})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#a855f7', borderRadius: '2px' }} />
                            <span style={{ color: 'var(--foreground-muted)' }}>B</span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#a855f7' }}>{pctB}% ({countB})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '2px' }} />
                            <span style={{ color: 'var(--foreground-muted)' }}>C</span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#f59e0b' }}>{pctC}% ({countC})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#ec4899', borderRadius: '2px' }} />
                            <span style={{ color: 'var(--foreground-muted)' }}>D</span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#ec4899' }}>{pctD}% ({countD})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Logs List (Answer Details) */}
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                      Answer Details Log
                    </h4>
                    
                    <div style={{ overflowX: 'auto', maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(0,0,0,0.15)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--foreground-muted)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Username</th>
                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Selected</th>
                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Correct Answer</th>
                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Result</th>
                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Submitted At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizSubs.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--foreground-dark)' }}>
                                No submissions recorded for this challenge yet.
                              </td>
                            </tr>
                          ) : (
                            [...quizSubs].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(sub => (
                              <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: '#fff' }}>{sub.user_name}</td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: sub.selected_option === selectedQuiz.correct_option ? 'var(--success)' : 'var(--danger)' }}>
                                  Option {sub.selected_option}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                                  Option {selectedQuiz.correct_option}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: sub.is_correct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: sub.is_correct ? 'var(--success)' : 'var(--danger)',
                                    border: sub.is_correct ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                  }}>
                                    {sub.is_correct ? 'Correct' : 'Incorrect'}
                                  </span>
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: 'var(--foreground-muted)' }}>
                                  {new Date(sub.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
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

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, UserProgress, Quiz, QuizSubmission } from '../types';
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

  // New states for Points, Leaderboard, and Quizzes
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState<Record<string, boolean>>({});
  const [quizResults, setQuizResults] = useState<Record<string, { isCorrect: boolean; rewardEarned: string }>>({});
  const [quizErrors, setQuizErrors] = useState<Record<string, string>>({});

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

      const subList = await getUserSubmissions(userId);
      setSubmissions(subList);
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
    await consumeStreakFreeze(currentUser.id);
    await loadDashboardData(currentUser.id);
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
        <section style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

            <button
              onClick={handleSignOut}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
            >
              Sign Out Account
            </button>
          </div>

          {/* Send Message to Admin Form */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#fff' }}>
                Message Admin 🛡️
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', margin: '0.2rem 0 0 0' }}>
                Have questions or need a streak adjustment? Send a note directly to the admin.
              </p>
            </div>

            <form onSubmit={handleSendMessageToAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <textarea
                className="input-field"
                placeholder="Type your message here..."
                value={adminMessageText}
                onChange={(e) => setAdminMessageText(e.target.value)}
                maxLength={300}
                required
                style={{
                  minHeight: '80px',
                  fontSize: '0.8rem',
                  padding: '0.5rem 0.75rem',
                  resize: 'vertical',
                }}
              />
              <button
                type="submit"
                disabled={adminMessageSending || !adminMessageText.trim()}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  opacity: adminMessageText.trim() ? 1 : 0.5,
                }}
              >
                {adminMessageSending ? 'Sending...' : 'Send Message'}
              </button>
            </form>

            {adminMessageSuccess && (
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--success)',
                textAlign: 'center',
                background: 'rgba(16, 185, 129, 0.06)',
                padding: '4px',
                borderRadius: '4px',
              }}>
                {adminMessageSuccess}
              </div>
            )}

            {adminMessageError && (
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--danger)',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.06)',
                padding: '4px',
                borderRadius: '4px',
              }}>
                {adminMessageError}
              </div>
            )}
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

              {/* Row 4: Quiz / Challenge Section */}
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
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
                            <p style={{ fontSize: '0.82rem', color: 'var(--foreground-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                              {quiz.description}
                            </p>
                          )}

                          {/* Options list */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
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

              {/* Row 5: Public Leaderboard */}
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

                <div style={{ overflowX: 'auto' }}>
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
                                  <span>{user.name}</span>
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
              </div>
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

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSessionProfile,
  getAdminDashboardData,
  logoutUser,
  adminIncreaseStreak,
  adminDecreaseStreak,
  adminRemoveStreak,
  adminAdjustLongestStreak,
  adminSendNotification,
  adminSendNotificationToAll,
  getAdminMessages,
  getAllNotificationsForAdmin,
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
  markAllNotificationsRead,
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
  const [pointsInputState, setPointsInputState] = useState<Record<string, number>>({});

  // Notification composer state
  const [notifTarget, setNotifTarget] = useState<string | null>(null); // userId or 'all'
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [adminMessages, setAdminMessages] = useState<(Notification & { user_name: string })[]>([]);
  const [allNotifications, setAllNotifications] = useState<(Notification & { user_name: string })[]>([]);

  // Trainee chat center states
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [searchChatQuery, setSearchChatQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Global Points & Quizzes states
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

  // localAdjustments for trainee adjustments card
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, { streak: number; longestStreak: number; freezes: number; points: number }>>({});

  const loadData = useCallback(async () => {
    try {
      const data = await getAdminDashboardData();
      setTrainees(data.trainees);
      setSubmissions(data.submissions);

      const messages = await getAdminMessages();
      setAdminMessages(messages);

      const notifs = await getAllNotificationsForAdmin();
      setAllNotifications(notifs);

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
      console.error("Error fetching admin data:", err);
    }
  }, [selectedQuizId]);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const profile = await getSessionProfile();
      if (profile) {
        if (profile.is_admin) {
          if (profile.name && profile.name.includes("Aether")) {
            profile.name = profile.name.replace(/Aether/g, "Ascend");
          }
          setAdminProfile(profile);
          await loadData();
          setLoading(false);
        } else {
          router.push("/");
        }
      } else {
        router.push("/login");
      }
    }
    checkAdminAndLoad();
  }, [router, loadData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const notifs = await getAllNotificationsForAdmin();
        setAllNotifications(notifs);
      } catch (err) {
        console.error("Error polling messages:", err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatUserId, allNotifications]);

  const handleSelectChatUser = useCallback(async (userId: string) => {
    setSelectedChatUserId(userId);
    try {
      await markAllNotificationsRead(userId);
      const notifs = await getAllNotificationsForAdmin();
      setAllNotifications(notifs);
    } catch (err) {
      console.error("Error marking messages read:", err);
    }
  }, []);

  const handleSendChatReply = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChatUserId && replyText.trim()) {
      setReplySending(true);
      try {
        await adminSendNotification(selectedChatUserId, replyText.trim());
        setReplyText("");
        const notifs = await getAllNotificationsForAdmin();
        setAllNotifications(notifs);
      } catch (err) {
        console.error("Error sending reply:", err);
      } finally {
        setReplySending(false);
      }
    }
  }, [selectedChatUserId, replyText]);

  const handleSignOut = useCallback(async () => {
    await logoutUser();
    router.push("/login");
  }, [router]);

  const handleConfirmResetStreak = useCallback(async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminRemoveStreak(userId);
      await loadData();
    } catch (err) {
      console.error("Error removing streak:", err);
    } finally {
      setActionLoading(null);
      setConfirmReset(null);
    }
  }, [loadData]);

  const handleToggleFreeze = useCallback(async (userId: string, isFrozen: boolean) => {
    setActionLoading(userId);
    try {
      await adminToggleFreezeStreak(userId, !isFrozen);
      await loadData();
    } catch (err) {
      console.error("Error toggling freeze streak:", err);
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleSendNotification = useCallback(async () => {
    if (notifTarget && notifMessage.trim()) {
      setNotifSending(true);
      try {
        if (notifTarget === "all") {
          await adminSendNotificationToAll(notifMessage.trim());
          setNotifSuccess("Broadcast notification sent to all trainees!");
        } else {
          await adminSendNotification(notifTarget, notifMessage.trim());
          const user = trainees.find(t => t.id === notifTarget);
          setNotifSuccess(`Notification sent to ${user?.name || "user"}!`);
        }
        setNotifMessage("");
        setNotifTarget(null);
        setTimeout(() => setNotifSuccess(""), 3000);
      } catch (err) {
        console.error("Error sending notification:", err);
      } finally {
        setNotifSending(false);
      }
    }
  }, [notifTarget, notifMessage, trainees]);

  const adjustLocalValue = useCallback((userId: string, field: "streak" | "longestStreak" | "freezes" | "points", delta: number) => {
    setLocalAdjustments(prev => {
      const user = trainees.find(t => t.id === userId);
      const currentVal = prev[userId] || {
        streak: user?.streak.currentStreak ?? 0,
        longestStreak: user?.streak.longestStreak ?? 0,
        freezes: user?.streak_freezes ?? 0,
        points: user?.points ?? 0,
      };
      let newVal = currentVal[field] + delta;
      if (field === "streak" || field === "longestStreak" || field === "freezes" || field === "points") {
        newVal = Math.max(0, newVal);
      }
      return {
        ...prev,
        [userId]: {
          ...currentVal,
          [field]: newVal,
        },
      };
    });
  }, [trainees]);

  const discardLocalValue = useCallback((userId: string) => {
    setLocalAdjustments(prev => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
  }, []);

  const handleSaveChanges = useCallback(async (userId: string) => {
    const trainee = trainees.find(t => t.id === userId);
    if (!trainee) return;

    const adjustment = localAdjustments[userId];
    if (!adjustment) return;

    const currentStreak = trainee.streak.currentStreak;
    const longestStreak = trainee.streak.longestStreak;
    const freezes = trainee.streak_freezes ?? 0;
    const points = trainee.points ?? 0;

    const streakDiff = adjustment.streak - currentStreak;
    const longestDiff = adjustment.longestStreak - longestStreak;
    const freezesDiff = adjustment.freezes - freezes;
    const pointsDiff = adjustment.points - points;

    if (streakDiff !== 0 || longestDiff !== 0 || freezesDiff !== 0 || pointsDiff !== 0) {
      setActionLoading(userId);
      try {
        if (streakDiff > 0) {
          await adminIncreaseStreak(userId, streakDiff);
        } else if (streakDiff < 0) {
          await adminDecreaseStreak(userId, Math.abs(streakDiff));
        }

        if (longestDiff !== 0) {
          await adminAdjustLongestStreak(userId, longestDiff);
        }

        if (freezesDiff !== 0) {
          await adminAdjustStreakFreezes(userId, freezesDiff);
        }

        if (pointsDiff !== 0) {
          await adminAdjustPoints(userId, pointsDiff);
        }

        setLocalAdjustments(prev => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });

        await loadData();
      } catch (err) {
        console.error("Error saving changes:", err);
        alert("Failed to save changes");
      } finally {
        setActionLoading(null);
      }
    }
  }, [trainees, localAdjustments, loadData]);

  const handleUpdatePointsMultiplier = useCallback(async () => {
    try {
      await updatePointsPerProblem(pointsMultiplier);
      alert("Points multiplier updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update multiplier");
    }
  }, [pointsMultiplier]);

  const handleQuizSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizSubmitError("");
    setQuizSubmitSuccess("");

    if (!quizTitle.trim() || !quizOptA.trim() || !quizOptB.trim() || !quizOptC.trim() || !quizOptD.trim()) {
      setQuizSubmitError("Title and options A, B, C, D are required.");
      return;
    }

    try {
      const quizData = {
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
        await updateQuiz(editingQuizId, quizData);
        setQuizSubmitSuccess("Quiz question updated successfully!");
      } else {
        await addQuiz(quizData);
        setQuizSubmitSuccess("Quiz question created successfully!");
      }

      setQuizTitle("");
      setQuizDescription("");
      setQuizOptA("");
      setQuizOptB("");
      setQuizOptC("");
      setQuizOptD("");
      setQuizCorrectOpt("A");
      setQuizRewardType("points");
      setQuizRewardAmount(50);
      setEditingQuizId(null);

      const quizList = await getQuizzes();
      setQuizzes(quizList);
    } catch (err: any) {
      console.error(err);
      setQuizSubmitError(err.message || "Error saving quiz question.");
    }
  }, [editingQuizId, quizTitle, quizDescription, quizOptA, quizOptB, quizOptC, quizOptD, quizCorrectOpt, quizRewardType, quizRewardAmount]);

  const handleEditQuiz = useCallback((quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || "");
    setQuizOptA(quiz.option_a);
    setQuizOptB(quiz.option_b);
    setQuizOptC(quiz.option_c);
    setQuizOptD(quiz.option_d);
    setQuizCorrectOpt(quiz.correct_option);
    setQuizRewardType(quiz.reward_type);
    setQuizRewardAmount(quiz.reward_amount);
  }, []);

  const handleDeleteQuiz = useCallback(async (quizId: string) => {
    if (confirm("Are you sure you want to delete this quiz question?")) {
      try {
        await deleteQuiz(quizId);
        const quizList = await getQuizzes();
        setQuizzes(quizList);
      } catch (err) {
        console.error("Error deleting quiz:", err);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner" style={{ width: "40px", height: "40px", border: "4px solid rgba(14, 165, 233, 0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--foreground-muted)", fontWeight: 500 }}>Loading administrative data...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="main-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
            padding: "8px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "0.05em", lineHeight: "1.1" }}>
              ASCEND <span style={{ fontWeight: 300, color: "var(--foreground-muted)" }}>ADMIN</span>
            </h1>
            <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--foreground-muted)", letterSpacing: "0.05em" }}>
              by Consistency Club
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.push("/")} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
            ← Dashboard
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {adminProfile?.avatar_url && (
              <img src={adminProfile.avatar_url} alt="Admin" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)" }} />
            )}
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {adminProfile?.name ? adminProfile.name.replace(/Aether/g, "Ascend") : ""}
            </span>
          </div>
          <button onClick={handleSignOut} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="admin-grid" style={{ flexGrow: 1, maxWidth: "1400px", margin: "0 auto" }}>
        {/* Left Column */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
          {/* Trainee Streaks Leaderboard */}
          <div className="glass-panel" style={{ height: "100%" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--foreground)" }}>
              Trainee Streak Leaderboard
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
              Manage streaks, send notifications, and monitor all registered users.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "1.25rem" }}>
              <button
                onClick={() => setNotifTarget(notifTarget === "all" ? null : "all")}
                className="btn-secondary"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.4rem 0.8rem",
                  background: notifTarget === "all" ? "rgba(14, 165, 233, 0.12)" : undefined,
                  border: notifTarget === "all" ? "1px solid var(--primary)" : undefined,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>📢 Broadcast to All Trainees</span>
              </button>
            </div>

            {notifTarget === "all" && (
              <div className="animate-fade-in" style={{
                background: "rgba(14, 165, 233, 0.04)",
                border: "1px solid rgba(14, 165, 233, 0.15)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                marginBottom: "1.25rem"
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
                  style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendNotification();
                  }}
                />
                <button
                  onClick={handleSendNotification}
                  disabled={notifSending || !notifMessage.trim()}
                  className="btn-primary"
                  style={{
                    padding: "0.45rem 0.8rem",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                    opacity: notifMessage.trim() ? 1 : 0.5
                  }}
                >
                  {notifSending ? "Broadcasting..." : "Broadcast"}
                </button>
              </div>
            )}

            {notifSuccess && (
              <div className="animate-fade-in" style={{
                fontSize: "0.8rem",
                color: "var(--success)",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {notifSuccess}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {trainees.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--foreground-dark)" }}>
                  No trainee profiles registered yet.
                </div>
              ) : (
                trainees.map(user => {
                  const localVal = localAdjustments[user.id] || {
                    streak: user.streak.currentStreak,
                    longestStreak: user.streak.longestStreak,
                    freezes: user.streak_freezes ?? 0,
                    points: user.points ?? 0
                  };
                  const hasChanges = !!(localAdjustments[user.id] && (
                    localVal.streak !== user.streak.currentStreak ||
                    localVal.longestStreak !== user.streak.longestStreak ||
                    localVal.freezes !== (user.streak_freezes ?? 0) ||
                    localVal.points !== (user.points ?? 0)
                  ));

                  return (
                    <React.Fragment key={user.id}>
                      <div
                        className="glass-panel"
                        style={{
                          padding: "1.5rem",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.45)",
                          border: "1px solid var(--glass-border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                          opacity: actionLoading === user.id ? 0.6 : 1,
                          transition: "opacity 0.2s",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <img
                              src={user.avatar_url || ""}
                              alt={user.name}
                              style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.08)" }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{user.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--foreground-dark)" }}>{user.email || "N/A"}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              onClick={() => handleToggleFreeze(user.id, !!user.streak.isFrozen)}
                              disabled={actionLoading === user.id}
                              className="btn-secondary"
                              style={{
                                background: user.streak.isFrozen ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                border: user.streak.isFrozen ? "1px solid var(--primary)" : "1px solid var(--glass-border)",
                                color: user.streak.isFrozen ? "#38bdf8" : "var(--foreground-muted)",
                                padding: "0.4rem 0.75rem",
                                fontSize: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                              title={user.streak.isFrozen ? "Unfreeze streak" : "Freeze streak"}
                            >
                              {user.streak.isFrozen ? "❄️ Frozen" : "🔥 Active"}
                            </button>

                            <button
                              onClick={() => setNotifTarget(notifTarget === user.id ? null : user.id)}
                              className="btn-secondary"
                              style={{
                                padding: "0.4rem 0.6rem",
                                fontSize: "0.75rem",
                                background: notifTarget === user.id ? "rgba(14, 165, 233, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                border: notifTarget === user.id ? "1px solid var(--primary)" : "1px solid var(--glass-border)"
                              }}
                              title="Send Notification"
                            >
                              📩 Msg
                            </button>

                            <button
                              onClick={() => setConfirmReset(user.id)}
                              disabled={actionLoading === user.id}
                              className="btn-secondary"
                              style={{
                                padding: "0.4rem 0.6rem",
                                fontSize: "0.75rem",
                                background: confirmReset === user.id ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                border: confirmReset === user.id ? "1px solid var(--danger)" : "1px solid var(--glass-border)",
                                color: "var(--danger)"
                              }}
                              title="Reset all streaks"
                            >
                              🗑️ Reset
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", background: "rgba(0,0,0,0.18)", padding: "0.75rem 0.8rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
                            <div>
                              <span style={{ color: "var(--foreground-muted)" }}>Database Streak:</span>{" "}
                              <strong style={{ color: user.streak.isFrozen ? "#38bdf8" : "#f97316" }}>
                                {user.streak.isFrozen ? "❄️" : "🔥"} {user.streak.currentStreak}
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: "var(--foreground-muted)" }}>Database Best Streak:</span>{" "}
                              <strong style={{ color: "var(--success)" }}>{user.streak.longestStreak}</strong>
                            </div>
                            <div>
                              <span style={{ color: "var(--foreground-muted)" }}>Stored Freezes:</span>{" "}
                              <strong style={{ color: "#38bdf8" }}>{user.streak_freezes ?? 0}</strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.25rem" }}>
                          <div className="trainee-adjustments-grid" style={{ background: "rgba(0, 0, 0, 0.25)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
                            {/* Streak */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }} title="Current streak override.">
                                Streak
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", minWidth: "24px", textAlign: "center" }}>
                                  {localVal.streak}
                                </span>
                                <div style={{ display: "flex", gap: "0.25rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "streak", -1)}
                                    className="adjust-btn"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "streak", 1)}
                                    className="adjust-btn"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Longest */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Longest
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", minWidth: "24px", textAlign: "center" }}>
                                  {localVal.longestStreak}
                                </span>
                                <div style={{ display: "flex", gap: "0.25rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "longestStreak", -1)}
                                    className="adjust-btn"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "longestStreak", 1)}
                                    className="adjust-btn"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Freezes */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Freezes
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.2rem" }}>
                                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#38bdf8", minWidth: "30px", textAlign: "center" }}>
                                  {localVal.freezes}
                                </span>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "freezes", -1)}
                                    className="adjust-btn"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "freezes", 1)}
                                    className="adjust-btn"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Points */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Points
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.2rem" }}>
                                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success)", minWidth: "30px", textAlign: "center" }}>
                                  {localVal.points}
                                </span>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "points", -1)}
                                    className="adjust-btn"
                                    title="-1 point"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustLocalValue(user.id, "points", 1)}
                                    className="adjust-btn"
                                    title="+1 point"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {hasChanges && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                ⚠️ Unsaved Changes
                              </span>
                              <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                                <button
                                  onClick={() => handleSaveChanges(user.id)}
                                  disabled={actionLoading === user.id}
                                  style={{
                                    flex: 1,
                                    padding: "0.55rem 1rem",
                                    background: "linear-gradient(135deg, var(--success) 0%, #047857 100%)",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 10px rgba(16, 185, 129, 0.15)",
                                    transition: "opacity 0.2s"
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                                >
                                  {actionLoading === user.id ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                  onClick={() => discardLocalValue(user.id)}
                                  disabled={actionLoading === user.id}
                                  style={{
                                    padding: "0.55rem 0.8rem",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    color: "var(--foreground-muted)",
                                    fontSize: "0.8rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  Discard
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {confirmReset === user.id && (
                          <div className="animate-fade-in" style={{
                            background: "rgba(239, 68, 68, 0.05)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            borderRadius: "8px",
                            padding: "0.75rem 1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            marginTop: "0.25rem"
                          }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--danger)", fontWeight: 600 }}>
                              ⚠️ Reset ALL activity data for {user.name}?
                            </span>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                onClick={() => handleConfirmResetStreak(user.id)}
                                style={{
                                  padding: "4px 12px",
                                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                  border: "none",
                                  borderRadius: "6px",
                                  color: "#fff",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                Confirm Reset
                              </button>
                              <button
                                onClick={() => setConfirmReset(null)}
                                className="btn-secondary"
                                style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {notifTarget === user.id && (
                          <div className="animate-fade-in" style={{
                            background: "rgba(14, 165, 233, 0.04)",
                            border: "1px solid rgba(14, 165, 233, 0.15)",
                            borderRadius: "8px",
                            padding: "0.75rem 1rem",
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginTop: "0.25rem"
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
                              style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSendNotification();
                              }}
                            />
                            <button
                              onClick={handleSendNotification}
                              disabled={notifSending || !notifMessage.trim()}
                              className="btn-primary"
                              style={{
                                padding: "0.45rem 0.8rem",
                                fontSize: "0.75rem",
                                whiteSpace: "nowrap",
                                opacity: notifMessage.trim() ? 1 : 0.5
                              }}
                            >
                              {notifSending ? "Sending..." : "Send"}
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>

          {/* Global Points Configuration */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
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
                onClick={handleUpdatePointsMultiplier}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', alignSelf: 'flex-end' }}
              >
                Save Setting
              </button>
            </div>
          </div>

          {/* Quiz & Challenge Builder */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                Quiz & Challenge Builder 🧠
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
                {editingQuizId ? 'Edit quiz question options and correct answer.' : 'Create multiple choice quiz challenges with automated rewards.'}
              </p>
            </div>
            
            <form onSubmit={handleQuizSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                  Question Title
                </label>
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
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                  Description / Code Snippet
                </label>
                <textarea
                  className="input-field"
                  placeholder="e.g. What is the time complexity of the fibonacci memoized lookup?"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  style={{ minHeight: '60px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

              <div className="quiz-options-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>
                    Option A
                  </label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>
                    Option B
                  </label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>
                    Option C
                  </label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>
                    Option D
                  </label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Correct Option
                  </label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Reward Type
                  </label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Reward Amount
                  </label>
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

            {/* Active Challenges */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Active Challenges (Last 24 Hours)
              </h3>
              {(() => {
                const activeQuizzes = quizzes.filter(q => Date.now() < new Date(q.created_at).getTime() + 24 * 60 * 60 * 1000);
                if (activeQuizzes.length === 0) {
                  return (
                    <p style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)', marginBottom: '1rem' }}>
                      No active challenges.
                    </p>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem' }}>
                    {activeQuizzes.map(q => (
                      <div
                        key={q.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: selectedQuizId === q.id ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.04)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: selectedQuizId === q.id ? '1px solid var(--primary)' : '1px solid rgba(14, 165, 233, 0.15)'
                        }}
                      >
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
                            onClick={() => handleEditQuiz(q)}
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

            {/* Quiz History */}
            <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.5rem' }}>
                Quiz History (Expired Quizzes)
              </h3>
              {(() => {
                const expiredQuizzes = quizzes.filter(q => Date.now() >= new Date(q.created_at).getTime() + 24 * 60 * 60 * 1000);
                if (expiredQuizzes.length === 0) {
                  return (
                    <p style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)' }}>
                      No expired quizzes in history.
                    </p>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                    {expiredQuizzes.map(q => (
                      <div
                        key={q.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: selectedQuizId === q.id ? 'rgba(14, 165, 233, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: selectedQuizId === q.id ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.03)'
                        }}
                      >
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

        {/* Right Column */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
          {/* Work Submission Screen Feeds */}
          <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--foreground)" }}>
              Work Submission Screen Feeds
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "1.5rem" }}>
              JPG uploads from trainees showing evidence of daily task accomplishments.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto", flexGrow: 1, maxHeight: "600px", paddingRight: "4px" }}>
              {submissions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "5rem 0", color: "var(--foreground-dark)", flexGrow: 1 }} className="flex-center">
                  No JPG work uploads found.
                </div>
              ) : (
                submissions.map(sub => (
                  <div key={sub.id} className="glass-panel" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <img src={sub.avatarUrl || ""} alt={sub.userName} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{sub.userName}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>
                            {new Date(sub.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", background: "rgba(14, 165, 233, 0.12)", border: "1px solid rgba(14, 165, 233, 0.2)", color: "var(--primary)", fontWeight: 600 }}>
                        {sub.category}
                      </span>
                    </div>

                    {sub.notes && (
                      <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", background: "rgba(0,0,0,0.1)", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
                        {sub.notes}
                      </p>
                    )}

                    {sub.image_url && (
                      <div onClick={() => setLightboxImage(sub.image_url)} style={{ position: "relative", width: "100%", height: "150px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", transition: "var(--transition-smooth)" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"} onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}>
                        <img src={sub.image_url} alt="Work screenshot" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)", padding: "0.5rem", textAlign: "center", color: "#fff", fontSize: "0.75rem", fontWeight: 500 }}>
                          Click to View Full JPG Screen
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trainee Chat Center */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", marginTop: "1.5rem", minHeight: "500px", maxHeight: "550px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--foreground)" }}>
              Trainee Chat Center 💬
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
              Direct messaging and updates history with trainees.
            </p>

            <div className={`inbox-grid ${selectedChatUserId ? "chat-active" : ""}`} style={{ flexGrow: 1, minHeight: "380px" }}>
              {/* Left Side: Users list */}
              <div className="users-list-pane">
                <div style={{ padding: "0.5rem", borderBottom: "1px solid var(--glass-border)" }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search trainees..."
                    value={searchChatQuery}
                    onChange={(e) => setSearchChatQuery(e.target.value)}
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem", width: "100%" }}
                  />
                </div>

                <div style={{ overflowY: "auto", flexGrow: 1, maxHeight: "380px" }}>
                  {(() => {
                    const userIds = Array.from(new Set(allNotifications.map(n => n.user_id)));
                    const chatUsers = userIds.map(uid => {
                      const userNotifs = allNotifications.filter(n => n.user_id === uid);
                      const trainee = trainees.find(t => t.id === uid);
                      const name = trainee?.name || userNotifs[0]?.user_name || "Unknown User";
                      const sorted = [...userNotifs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      const lastMessage = sorted[0]?.message || "";
                      const lastMessageTime = sorted[0] ? new Date(sorted[0].created_at).getTime() : 0;
                      const unreadCount = userNotifs.filter(n => !n.is_read && !n.from_admin).length;

                      return {
                        userId: uid,
                        userName: name,
                        lastMessage,
                        lastMessageTime,
                        unreadCount
                      };
                    })
                    .filter(u => u.userName.toLowerCase().includes(searchChatQuery.toLowerCase()))
                    .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

                    if (userIds.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "2rem 0.5rem", color: "var(--foreground-dark)", fontSize: "0.75rem" }}>
                          No chat history.
                        </div>
                      );
                    }
                    if (chatUsers.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "2rem 0.5rem", color: "var(--foreground-dark)", fontSize: "0.75rem" }}>
                          No users match.
                        </div>
                      );
                    }

                    return chatUsers.map(user => {
                      const isSelected = selectedChatUserId === user.userId;
                      return (
                        <button
                          key={user.userId}
                          type="button"
                          onClick={() => handleSelectChatUser(user.userId)}
                          style={{
                            width: "100%",
                            border: "none",
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            padding: "0.75rem 0.6rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            textAlign: "left",
                            background: isSelected ? "rgba(14, 165, 233, 0.12)" : "transparent",
                            cursor: "pointer",
                            transition: "background 0.2s"
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.8rem", color: isSelected ? "var(--primary)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                              {user.userName}
                            </span>
                            {user.lastMessageTime > 0 && (
                              <span style={{ fontSize: "0.6rem", color: "var(--foreground-dark)" }}>
                                {new Date(user.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexGrow: 1, textAlign: "left" }}>
                              {user.lastMessage}
                            </span>
                            {user.unreadCount > 0 && (
                              <span style={{ background: "var(--primary)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, borderRadius: "50%", minWidth: "15px", height: "15px", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px" }}>
                                {user.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Side: Chat Window */}
              <div className="chat-window-pane">
                {(() => {
                  if (!selectedChatUserId) {
                    return (
                      <div style={{ margin: "auto", textAlign: "center", color: "var(--foreground-dark)", fontSize: "0.8rem", padding: "2rem" }}>
                        Select a trainee from the left list to view active conversation and send replies.
                      </div>
                    );
                  }
                  const trainee = trainees.find(t => t.id === selectedChatUserId);
                  const chatName = trainee?.name || "Unknown Trainee";
                  const chatList = allNotifications
                    .filter(n => n.user_id === selectedChatUserId)
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                  return (
                    <React.Fragment>
                      <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="mobile-back-btn"
                            onClick={() => setSelectedChatUserId(null)}
                          >
                            ← Back
                          </button>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>Chat: {chatName}</span>
                        </div>
                        <span style={{ fontSize: "0.65rem", color: "var(--foreground-muted)", display: "inline-block" }}>
                          ID: <code style={{ fontSize: "0.6rem" }}>{selectedChatUserId}</code>
                        </span>
                      </div>

                      <div style={{ flexGrow: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "350px" }}>
                        {chatList.length === 0 ? (
                          <div style={{ margin: "auto", color: "var(--foreground-dark)", fontSize: "0.75rem" }}>
                            No messages exchanged yet.
                          </div>
                        ) : (
                          chatList.map(msg => {
                            const isTraineeMsg = !msg.from_admin;
                            return (
                              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignSelf: isTraineeMsg ? "flex-end" : "flex-start", maxWidth: "75%", gap: "2px" }}>
                                <div style={{
                                  background: isTraineeMsg ? "rgba(14, 165, 233, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                  border: isTraineeMsg ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid var(--glass-border)",
                                  padding: "0.5rem 0.75rem",
                                  borderRadius: isTraineeMsg ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                  color: "#fff",
                                  fontSize: "0.8rem",
                                  wordBreak: "break-word",
                                  whiteSpace: "pre-wrap",
                                  textAlign: "left"
                                }}>
                                  {msg.message}
                                </div>
                                <div style={{ fontSize: "0.6rem", color: "var(--foreground-dark)", textAlign: isTraineeMsg ? "right" : "left", padding: "0 4px" }}>
                                  {new Date(msg.created_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <form onSubmit={handleSendChatReply} style={{ padding: "0.5rem 0.75rem", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.1)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={`Reply to ${chatName}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          maxLength={300}
                          required
                          style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", flexGrow: 1 }}
                        />
                        <button type="submit" disabled={replySending || !replyText.trim()} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", whiteSpace: "nowrap", opacity: replyText.trim() ? 1 : 0.5 }}>
                          {replySending ? "Sending..." : "Send"}
                        </button>
                      </form>
                    </React.Fragment>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Quiz Analytics Card */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", marginTop: "1.5rem", gap: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                Quiz Analytics & Submissions 📊
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginTop: "0.25rem" }}>
                Select a quiz challenge from the left builder panel to analyze trainee responses and performance.
              </p>
            </div>

            {(() => {
              const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
              if (!selectedQuiz) {
                return (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--foreground-dark)" }}>
                    No quiz selected or available. Click the 📊 icon on any quiz in the builder panel.
                  </div>
                );
              }

              const quizSubs = allSubmissions.filter(sub => sub.quiz_id === selectedQuizId);
              const total = quizSubs.length;
              const correct = quizSubs.filter(sub => sub.is_correct).length;
              const incorrect = total - correct;
              const correctPercent = total > 0 ? Math.round((correct / total) * 100) : 0;
              const incorrectPercent = total > 0 ? Math.round((incorrect / total) * 100) : 0;

              const countA = quizSubs.filter(sub => sub.selected_option === "A").length;
              const countB = quizSubs.filter(sub => sub.selected_option === "B").length;
              const countC = quizSubs.filter(sub => sub.selected_option === "C").length;
              const countD = quizSubs.filter(sub => sub.selected_option === "D").length;

              const percentA = total > 0 ? Math.round((countA / total) * 100) : 0;
              const percentB = total > 0 ? Math.round((countB / total) * 100) : 0;
              const percentC = total > 0 ? Math.round((countC / total) * 100) : 0;
              const percentD = total > 0 ? Math.round((countD / total) * 100) : 0;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ padding: "0.75rem 1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary)", margin: 0 }}>{selectedQuiz.title}</h3>
                    {selectedQuiz.description && (
                      <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", margin: "0.25rem 0 0 0", whiteSpace: "pre-wrap" }}>
                        {selectedQuiz.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--foreground-dark)" }}>
                      <span>
                        Correct Answer: <strong style={{ color: "var(--success)" }}>Option {selectedQuiz.correct_option}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Reward: {selectedQuiz.reward_amount} {selectedQuiz.reward_type === "points" ? "Points ⭐" : "Freezes ❄️"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    {/* Correct vs Incorrect chart */}
                    <div style={{ border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "1rem", background: "rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", margin: 0 }}>Correct vs Incorrect</h4>
                      <div style={{
                        position: "relative",
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        background: total > 0 ? `conic-gradient(var(--success) 0% ${correctPercent}%, var(--danger) ${correctPercent}% 100%)` : "#334155",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                      }}>
                        <div style={{ position: "absolute", width: "80px", height: "80px", borderRadius: "50%", background: "#0b0f19", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{total}</span>
                          <span style={{ fontSize: "0.6rem", color: "var(--foreground-muted)", textTransform: "uppercase" }}>Answers</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", width: "100%", marginTop: "0.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)" }} />
                            <span style={{ color: "var(--foreground-muted)" }}>Correct</span>
                          </div>
                          <strong style={{ color: "var(--success)" }}>{correctPercent}% ({correct})</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)" }} />
                            <span style={{ color: "var(--foreground-muted)" }}>Incorrect</span>
                          </div>
                          <strong style={{ color: "var(--danger)" }}>{incorrectPercent}% ({incorrect})</strong>
                        </div>
                      </div>
                    </div>

                    {/* Answer distribution chart */}
                    <div style={{ border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "1rem", background: "rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", margin: 0 }}>Answer Distribution</h4>
                      <div style={{
                        position: "relative",
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        background: total > 0 ? `conic-gradient(#38bdf8 0% ${percentA}%, #a855f7 ${percentA}% ${percentA + percentB}%, #f59e0b ${percentA + percentB}% ${percentA + percentB + percentC}%, #ec4899 ${percentA + percentB + percentC}% 100%)` : "#334155",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                      }}>
                        <div style={{ position: "absolute", width: "80px", height: "80px", borderRadius: "50%", background: "#0b0f19", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" }}>Options</span>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem", fontSize: "0.7rem", width: "100%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "8px", height: "8px", background: "#38bdf8", borderRadius: "2px" }} />
                            <span style={{ color: "var(--foreground-muted)" }}>A</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "#38bdf8" }}>{percentA}% ({countA})</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "8px", height: "8px", background: "#a855f7", borderRadius: "2px" }} />
                            <span style={{ color: "var(--foreground-muted)" }}>B</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "#a855f7" }}>{percentB}% ({countB})</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "8px", height: "8px", background: "#f59e0b", borderRadius: "2px" }} />
                            <span style={{ color: "var(--foreground-muted)" }}>C</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "#f59e0b" }}>{percentC}% ({countC})</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "8px", height: "8px", background: "#ec4899", borderRadius: "2px" }} />
                            <span style={{ color: "var(--foreground-muted)" }}>D</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "#ec4899" }}>{percentD}% ({countD})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>
                      Answer Details Log
                    </h4>
                    <div style={{ overflowX: "auto", maxHeight: "250px", overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "rgba(0,0,0,0.15)" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--foreground-muted)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>Username</th>
                            <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600, textAlign: "center" }}>Selected</th>
                            <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600, textAlign: "center" }}>Correct Answer</th>
                            <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600, textAlign: "center" }}>Result</th>
                            <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600, textAlign: "right" }}>Submitted At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizSubs.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--foreground-dark)" }}>
                                No submissions recorded for this challenge yet.
                              </td>
                            </tr>
                          ) : (
                            [...quizSubs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(sub => (
                              <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.01)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500, color: "#fff" }}>{sub.user_name}</td>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 700, color: sub.selected_option === selectedQuiz.correct_option ? "var(--success)" : "var(--danger)" }}>
                                  Option {sub.selected_option}
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", fontWeight: 700, color: "var(--success)" }}>
                                  Option {selectedQuiz.correct_option}
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: sub.is_correct ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", color: sub.is_correct ? "var(--success)" : "var(--danger)", border: sub.is_correct ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)" }}>
                                    {sub.is_correct ? "Correct" : "Incorrect"}
                                  </span>
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--foreground-muted)" }}>
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

      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="flex-center animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(5, 7, 13, 0.9)", zIndex: 999, padding: "2rem", cursor: "pointer" }}>
          <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", color: "#fff", fontSize: "1.5rem", fontWeight: 600 }}>
            ✕ Close
          </div>
          <div style={{ maxWidth: "90%", maxHeight: "85vh", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <img src={lightboxImage} alt="Screenshot Zoomed" style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", cursor: "default" }} onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { Streak, Activity } from '../types';

interface StreakCardProps {
  streak: Streak;
  userName: string;
  streakFreezes?: number;
  onUseFreeze?: () => Promise<void>;
  activities?: Activity[];
  freezeDates?: string[];
}

function StreakCardInner({ streak, userName, streakFreezes = 0, onUseFreeze, activities = [], freezeDates = [] }: StreakCardProps) {
  const { currentStreak, longestStreak, lastActiveDate, isFrozen } = streak;

  const getLocalStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalStr(yesterday);

  const dayBeforeYesterday = new Date();
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const dayBeforeYesterdayStr = getLocalStr(dayBeforeYesterday);

  const yesterdayActive = activities.some(a => a.date === yesterdayStr);
  const yesterdayFrozen = freezeDates.includes(yesterdayStr);
  const dayBeforeYesterdayActive = activities.some(a => a.date === dayBeforeYesterdayStr);
  const dayBeforeYesterdayFrozen = freezeDates.includes(dayBeforeYesterdayStr);

  const canFreeze = !yesterdayActive && !yesterdayFrozen && !!lastActiveDate && (
    lastActiveDate === dayBeforeYesterdayStr || 
    dayBeforeYesterdayActive ||
    dayBeforeYesterdayFrozen ||
    (lastActiveDate === todayStr && (dayBeforeYesterdayActive || dayBeforeYesterdayFrozen))
  );

  // Determine fire flame scale and intensity based on streak days
  const getFlameScale = () => {
    if (isFrozen) return 1.1;
    if (currentStreak === 0) return 0.8;
    if (currentStreak < 5) return 1.0;
    if (currentStreak < 15) return 1.2;
    return 1.4;
  };

  const getFlameColor = () => {
    if (isFrozen) return '#38bdf8'; // Frozen blue color
    if (currentStreak === 0) return '#64748b'; // Cold grey
    if (currentStreak < 3) return '#f97316'; // Warm orange
    if (currentStreak < 10) return '#f97316'; // Vivid orange
    return '#ef4444'; // Red-hot streak
  };

  const getMotivationalMessage = () => {
    if (isFrozen) {
      return `Your streak is currently frozen by the administrator! No stress — your progress is safe until you log your next activity. ❄️`;
    }
    if (currentStreak === 0) {
      return `Start your learning streak today! Log an activity to light the fire.`;
    }
    if (currentStreak < 3) {
      return `Spark ignited! Keep it up tomorrow to build momentum, ${userName}!`;
    }
    if (currentStreak < 7) {
      return `Awesome! You're burning bright. 1 week milestone is within reach!`;
    }
    if (currentStreak < 15) {
      return `Incredible! A double-digit streak! You're absolutely crushing it.`;
    }
    return `Unstoppable! You are in god-mode learning. Elite discipline! 🔥`;
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Glow when streak is active or frozen */}
      {(currentStreak > 0 || isFrozen) && (
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-20%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: isFrozen 
            ? 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, var(--streak-glow) 0%, transparent 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
      )}

      {/* Flame / Snowflake Icon visual container */}
      <div className="flex-center" style={{
        position: 'relative',
        zIndex: 1,
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: isFrozen
          ? 'rgba(56, 189, 248, 0.08)'
          : (currentStreak > 0 ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)'),
        border: `1px solid ${isFrozen
          ? 'rgba(56, 189, 248, 0.3)'
          : (currentStreak > 0 ? 'rgba(249, 115, 22, 0.2)' : 'var(--glass-border)')}`,
        transition: 'var(--transition-smooth)',
      }}>
        <div
          className={isFrozen ? 'streak-freeze-glow' : (currentStreak > 0 ? 'streak-flame-glow' : '')}
          style={{
            transform: `scale(${getFlameScale()})`,
            transition: 'var(--transition-smooth)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill={isFrozen ? 'none' : (currentStreak > 0 ? 'url(#flameGradient)' : 'none')}
            stroke={isFrozen || currentStreak === 0 ? 'currentColor' : 'none'}
            strokeWidth={isFrozen ? '1.8' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: getFlameColor(),
              filter: isFrozen
                ? 'drop-shadow(0 4px 8px rgba(56, 189, 248, 0.3))'
                : (currentStreak > 0 ? 'drop-shadow(0 4px 8px rgba(249, 115, 22, 0.3))' : 'none'),
            }}
          >
            <defs>
              <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
            </defs>
            {isFrozen ? (
              // Snowflake path
              <path d="M12 2v20M2 12h20M5.636 5.636l12.728 12.728M5.636 18.364L18.364 5.636M12 5l3 3m-3-3L9 8m3 11l3-3m-3 3l-3-3M5 12l3 3m-3-3l3-3m11 3l-3 3m3-3l-3-3" />
            ) : (
              // Flame paths
              <>
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0c0-1.657 1-3 2.5-4.5V11h3.5z" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Streak Information fields */}
      <div style={{ flexGrow: 1, zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Streak
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: isFrozen ? 'var(--primary)' : (currentStreak > 0 ? 'var(--streak-start)' : 'var(--foreground)'),
                textShadow: isFrozen ? '0 0 10px rgba(56, 189, 248, 0.2)' : (currentStreak > 0 ? '0 0 10px rgba(249, 115, 22, 0.2)' : 'none')
              }}>
                {currentStreak}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>days</span>
              {isFrozen && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  marginLeft: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  alignSelf: 'center'
                }}>
                  FROZEN ❄️
                </span>
              )}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Longest Streak
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>
                {longestStreak}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>days</span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Freezes ❄️
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8' }}>
                {streakFreezes}
              </span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--foreground-muted)' }}>
          {getMotivationalMessage()}
        </p>

        {lastActiveDate && (
          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)', marginTop: '0.5rem' }}>
            Last activity logged on: <strong>{new Date(lastActiveDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
        )}

        {canFreeze && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <button
              onClick={() => onUseFreeze?.()}
              disabled={streakFreezes <= 0}
              className="btn-primary"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                padding: '0.65rem 1rem',
              }}
            >
              <span>❄️ Save Streak (Use 1 Freeze)</span>
            </button>
            {streakFreezes <= 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.4rem', textAlign: 'center' }}>
                No freezes available. Ask an administrator for more freezes!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const StreakCard = React.memo(StreakCardInner);
export default StreakCard;

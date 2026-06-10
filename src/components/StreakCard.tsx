'use client';

import React from 'react';
import { Streak } from '../types';

interface StreakCardProps {
  streak: Streak;
  userName: string;
}

function StreakCardInner({ streak, userName }: StreakCardProps) {
  const { currentStreak, longestStreak, lastActiveDate } = streak;

  // Determine fire flame scale and intensity based on streak days
  const getFlameScale = () => {
    if (currentStreak === 0) return 0.8;
    if (currentStreak < 5) return 1.0;
    if (currentStreak < 15) return 1.2;
    return 1.4;
  };

  const getFlameColor = () => {
    if (currentStreak === 0) return '#64748b'; // Cold grey
    if (currentStreak < 3) return '#f97316'; // Warm orange
    if (currentStreak < 10) return '#f97316'; // Vivid orange
    return '#ef4444'; // Red-hot streak
  };

  const getMotivationalMessage = () => {
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
      {/* Background Glow when streak is active */}
      {currentStreak > 0 && (
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-20%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--streak-glow) 0%, transparent 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
      )}

      {/* Flame Icon visual container */}
      <div className="flex-center" style={{
        position: 'relative',
        zIndex: 1,
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: currentStreak > 0 ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${currentStreak > 0 ? 'rgba(249, 115, 22, 0.2)' : 'var(--glass-border)'}`,
        transition: 'var(--transition-smooth)',
      }}>
        <div
          className={currentStreak > 0 ? 'streak-flame-glow' : ''}
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
            fill={currentStreak > 0 ? 'url(#flameGradient)' : 'none'}
            stroke={currentStreak > 0 ? 'none' : 'currentColor'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: getFlameColor(),
              filter: currentStreak > 0 ? 'drop-shadow(0 4px 8px rgba(249, 115, 22, 0.3))' : 'none',
            }}
          >
            <defs>
              <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
            </defs>
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0c0-1.657 1-3 2.5-4.5V11h3.5z" />
          </svg>
        </div>
      </div>

      {/* Streak Information fields */}
      <div style={{ flexGrow: 1, zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Streak
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: currentStreak > 0 ? 'var(--streak-start)' : 'var(--foreground)',
                textShadow: currentStreak > 0 ? '0 0 10px rgba(249, 115, 22, 0.2)' : 'none'
              }}>
                {currentStreak}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>days</span>
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
        </div>

        <p style={{ fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--foreground-muted)' }}>
          {getMotivationalMessage()}
        </p>

        {lastActiveDate && (
          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)', marginTop: '0.5rem' }}>
            Last activity logged on: <strong>{new Date(lastActiveDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

const StreakCard = React.memo(StreakCardInner);
export default StreakCard;

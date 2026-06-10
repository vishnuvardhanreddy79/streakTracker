'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Notification } from '../types';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/db';

interface NotificationBellProps {
  userId: string;
}

function NotificationBellInner({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    const notifs = await getUserNotifications(userId);
    setNotifications(notifs);
  }, [userId]);

  useEffect(() => {
    let active = true;
    async function fetchInitial() {
      const notifs = await getUserNotifications(userId);
      if (active) setNotifications(notifs);
    }
    fetchInitial();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(async () => {
      const notifs = await getUserNotifications(userId);
      if (active) setNotifications(notifs);
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userId);
    await loadNotifications();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
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
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 700,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-main)',
            animation: 'pulseGlow 2s infinite ease-in-out',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            maxHeight: '420px',
            background: 'rgba(15, 23, 42, 0.97)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border-hover)',
            borderRadius: '14px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: 'var(--foreground-dark)',
                fontSize: '0.85rem',
              }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: notif.is_read ? 'transparent' : 'rgba(14, 165, 233, 0.04)',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    cursor: notif.is_read ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                  onMouseEnter={(e) => {
                    if (!notif.is_read) e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(14, 165, 233, 0.04)';
                  }}
                >
                  {/* Unread indicator dot */}
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: notif.is_read ? 'transparent' : 'var(--primary)',
                    flexShrink: 0,
                    marginTop: '6px',
                  }} />

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '3px',
                    }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--streak-start)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        🛡️ Admin
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-dark)' }}>
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.82rem',
                      color: notif.is_read ? 'var(--foreground-muted)' : 'var(--foreground)',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const NotificationBell = React.memo(NotificationBellInner);
export default NotificationBell;

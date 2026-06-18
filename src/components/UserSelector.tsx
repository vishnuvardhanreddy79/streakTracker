'use client';

import React, { useState } from 'react';
import { Profile } from '../types';

interface UserSelectorProps {
  profiles: Profile[];
  selectedUserId: string | null;
  onSelectUser: (id: string) => void;
  onAddUser: (name: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export default function UserSelector({
  profiles,
  selectedUserId,
  onSelectUser,
  onAddUser,
  onDeleteUser,
}: UserSelectorProps) {
  const [newUserName, setNewUserName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    setIsAdding(true);
    setError('');
    try {
      await onAddUser(newUserName.trim());
      setNewUserName('');
    } catch (err) {
      setError('Failed to add profile');
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(to right, var(--primary), var(--success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Trainees & Users
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
          Select a profile to track their streaks and daily progress.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }}>
        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--foreground-dark)' }}>
            No profiles found. Create one below!
          </div>
        ) : (
          profiles.map(profile => {
            const isSelected = profile.id === selectedUserId;
            return (
              <div
                key={profile.id}
                onClick={() => onSelectUser(profile.id)}
                className={`glass-panel-interactive`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.avatar_url || ''}
                    alt={profile.name}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? '#fff' : 'var(--foreground)', wordBreak: 'break-word' }}>
                      {profile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete ${profile.name}'s profile and all their history?`)) {
                      onDeleteUser(profile.id);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--foreground-dark)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-dark)'}
                  title="Delete user"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>
          Create New Profile
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input-field"
            placeholder="E.g., John Doe"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            disabled={isAdding}
            maxLength={30}
            style={{ fontSize: '0.85rem', flex: '1 1 150px' }}
          />
          <button type="submit" className="btn-primary" disabled={isAdding} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flex: '1 1 auto', minHeight: '44px', justifyContent: 'center' }}>
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>}
      </form>
    </div>
  );
}

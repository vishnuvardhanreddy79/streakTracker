'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkSupabaseStatus, supabase, addProfile, getSessionProfile } from '../../lib/db';

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSupabase, setIsSupabase] = useState(false);

  useEffect(() => {
    async function init() {
      const configured = await checkSupabaseStatus();
      setIsSupabase(configured);
      
      // If already logged in, redirect to dashboard
      const profile = await getSessionProfile();
      if (profile) {
        router.push('/');
      }
    }
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabase && supabase) {
        // Live Supabase Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (!data.user) {
          throw new Error('Failed to create user account');
        }

        // Add the profile mapping
        await addProfile(name.trim(), email.trim(), data.user.id);
        
        // Wait briefly for triggers and push to login
        router.push('/login?signup=success');
      } else {
        // Mock Mode Sign Up
        const localProfiles = localStorage.getItem('tracker_profiles');
        const profilesList = localProfiles ? JSON.parse(localProfiles) : [];
        
        // Check if email already registered in mock DB
        const exists = profilesList.find((p: { email?: string }) => p.email === email.trim());
        if (exists) {
          throw new Error('Email is already registered');
        }

        // Create new profile row
        const mockUserId = `user-mock-${Math.random().toString(36).substring(2, 11)}`;
        const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}`;
        const newProfile = {
          id: mockUserId,
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          avatar_url: avatarUrl,
          is_admin: email.trim() === 'Ascend1407@gmail.com', // automatically flag admin email
          created_at: new Date().toISOString(),
        };

        profilesList.push(newProfile);
        localStorage.setItem('tracker_profiles', JSON.stringify(profilesList));
        
        // Set mock session immediately
        localStorage.setItem('tracker_session', JSON.stringify(newProfile));
        
        // Redirect to dashboard
        router.push('/');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1.5rem', position: 'relative' }}>
      
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: 0 }} />

      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header branding */}
        <div style={{ textAlign: 'center' }}>
          <div className="flex-center" style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--success) 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}>
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>ASCEND</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
            by Consistency Club
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
            Create an account to start logging and tracking progress.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Full Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              minLength={6}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Confirm Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
              minLength={6}
            />
          </div>

          {/* Error alert box */}
          {error && (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--danger)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isSubmitting ? 'Creating account...' : 'Create Trainee Account'}
          </button>
        </form>

        <div style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: '1rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--foreground-muted)'
        }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Log In
          </Link>
        </div>

        {/* Mode Indicator Info */}
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--foreground-dark)' }}>
          {isSupabase ? '🔒 Database Cloud Sync is Active' : '💾 Offline Simulated database is Active'}
        </div>

      </div>
    </div>
  );
}

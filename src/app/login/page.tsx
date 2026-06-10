'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { checkSupabaseStatus, supabase, getSessionProfile } from '../../lib/db';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSupabase, setIsSupabase] = useState(false);

  useEffect(() => {
    async function init() {
      const configured = await checkSupabaseStatus();
      setIsSupabase(configured);

      // Check if registration was successful from query param
      if (searchParams.get('signup') === 'success') {
        setSuccessMsg('Account created! Please log in below.');
      }

      // Check if user is already logged in
      const profile = await getSessionProfile();
      if (profile) {
        if (profile.is_admin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    }
    init();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check for default admin login bypass (makes local admin access work seamlessly even in Supabase mode)
      if (email.trim() === 'admin@aether.com' && password.trim() === 'admin123') {
        const adminProfile = {
          id: 'user-admin',
          name: 'Aether Admin Manager',
          email: 'admin@aether.com',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
          is_admin: true,
          created_at: new Date().toISOString(),
        };

        // Add admin user to profiles list in mock DB if not exists
        const localProfiles = localStorage.getItem('tracker_profiles');
        const profilesList = localProfiles ? JSON.parse(localProfiles) : [];
        const exists = profilesList.find((p: { email?: string }) => p.email === 'admin@aether.com');
        if (!exists) {
          profilesList.push(adminProfile);
          localStorage.setItem('tracker_profiles', JSON.stringify(profilesList));
        }

        localStorage.setItem('tracker_session', JSON.stringify(adminProfile));
        router.push('/admin');
        return;
      }

      if (isSupabase && supabase) {
        // Live Supabase Authentication
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) {
          throw new Error(signInError.message);
        }

        if (!authData.user) {
          throw new Error('Authentication failed');
        }

        // Fetch user profile row to check is_admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error('Failed to retrieve profile data');
        }

        if (!profile) {
          throw new Error('Profile row does not exist for this account');
        }

        // Routing based on role
        if (profile.is_admin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        // Mock Offline Authentication
        const localProfiles = localStorage.getItem('tracker_profiles');
        const profilesList = localProfiles ? JSON.parse(localProfiles) : [];

        // Trainee login lookups
        const traineeProfile = profilesList.find(
          (p: { email?: string }) => p.email === email.trim()
        );

        if (!traineeProfile) {
          throw new Error('No trainee profile found with this email. Please sign up first.');
        }

        // Password simulated check: allow any matching password for mock demo, or check matches
        localStorage.setItem('tracker_session', JSON.stringify(traineeProfile));
        router.push('/');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please verify credentials.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1.5rem', position: 'relative' }}>
      
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', top: '15%', right: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: 0 }} />

      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Branding header */}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AETHER LOGIN</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>
            Access your progress dashboards or administrative panels.
          </p>
        </div>

        {/* Success registration banner */}
        {successMsg && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--success)',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Email */}
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
            />
          </div>

          {/* Error Banner */}
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

          {/* Login Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isSubmitting ? 'Verifying account...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: '1rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--foreground-muted)'
        }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LogIn() {
  return (
    <Suspense fallback={
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(14, 165, 233, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--foreground-muted)' }}>Loading authentication portal...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

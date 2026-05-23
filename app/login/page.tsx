'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden />

      <div className="auth-card slide-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">✦</div>
          <span className="auth-logo-text">PlanIQ</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="field">
            <label className="field-label">Email</label>
            <input
              type="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input
              type="password"
              className="field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-gradient auth-submit" disabled={loading}>
            {loading ? (
              <span className="btn-spinner">⟳</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button
          className="btn-ghost auth-google"
          onClick={() => toast('Google Sign-In — coming soon!')}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="auth-link">Sign up free</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #070611;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }
        .auth-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(108,92,231,.25) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 80%, rgba(90,171,240,.18) 0%, transparent 60%);
          pointer-events: none;
        }
        .auth-card {
          background: rgba(255,255,255,.06);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 28px;
          padding: 40px 32px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
          justify-content: center;
        }
        .auth-logo-icon {
          width: 36px;
          height: 36px;
          background: var(--gradient);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #fff;
        }
        .auth-logo-text {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -.5px;
        }
        .auth-title {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          text-align: center;
          margin-bottom: 6px;
        }
        .auth-sub {
          font-size: 14px;
          color: rgba(255,255,255,.5);
          text-align: center;
          margin-bottom: 28px;
        }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,.7);
        }
        .field-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,.08);
          border: 1.5px solid rgba(255,255,255,.12);
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-family: inherit;
          transition: border-color .18s;
          outline: none;
        }
        .field-input::placeholder { color: rgba(255,255,255,.3); }
        .field-input:focus { border-color: var(--purple); }
        .auth-submit {
          width: 100%;
          padding: 15px;
          font-size: 15px;
          border-radius: 14px;
          margin-top: 4px;
        }
        .btn-spinner {
          display: inline-block;
          animation: spin .8s linear infinite;
        }
        .auth-divider {
          text-align: center;
          margin: 20px 0;
          position: relative;
          color: rgba(255,255,255,.3);
          font-size: 12px;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 42%;
          height: 1px;
          background: rgba(255,255,255,.1);
        }
        .auth-divider::before { left: 0; }
        .auth-divider::after { right: 0; }
        .auth-google {
          width: 100%;
          padding: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          border-radius: 14px;
          background: rgba(255,255,255,.08);
          border: 1.5px solid rgba(255,255,255,.14);
          color: #fff;
        }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255,255,255,.45);
        }
        .auth-link {
          color: var(--pur-m);
          font-weight: 600;
          text-decoration: none;
        }
        .auth-link:hover { text-decoration: underline; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

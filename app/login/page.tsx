'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient, createImplicitClient } from '@/lib/supabase/client';

/* ─── Exact V3 BeamsBackground engine ─────────────────────────
   Direct port of the vanilla-canvas aceternity-ui BeamsBackground
   used in PlanIQ_Prototype_v3.html.
   Beams travel upward at a slight diagonal, blurred on the ctx
   (35px) + blurred on the canvas element (15px CSS).
   Hue range 230–290: blue-violet → purple.
──────────────────────────────────────────────────────────────── */
function startBeams(container: HTMLDivElement): () => void {
  const TOTAL = 30;
  const HUE_START = 230;
  const HUE_SPAN = 60;

  // Create canvas sized to container
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  let active = true;
  let raf = 0;

  function resize() {
    canvas.width  = container.offsetWidth  || window.innerWidth;
    canvas.height = container.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const W = () => canvas.width;
  const H = () => canvas.height;

  type Beam = {
    x: number; y: number; w: number; len: number;
    angle: number; speed: number; op: number;
    hue: number; pulse: number; ps: number;
  };

  function mkBeam(): Beam {
    return {
      x:     Math.random() * W() * 1.5 - W() * 0.25,
      y:     Math.random() * H() * 1.5 - H() * 0.25,
      w:     30 + Math.random() * 60,
      len:   H() * 2.5,
      angle: -35 + Math.random() * 10,
      speed: 0.6 + Math.random() * 1.2,
      op:    0.12 + Math.random() * 0.16,
      hue:   HUE_START + Math.random() * HUE_SPAN,
      pulse: Math.random() * Math.PI * 2,
      ps:    0.02 + Math.random() * 0.03,
    };
  }

  function resetBeam(b: Beam, i: number) {
    const sp = W() / 3;
    const col = i % 3;
    b.y     = H() + 100;
    b.x     = col * sp + sp / 2 + (Math.random() - 0.5) * sp * 0.5;
    b.w     = 100 + Math.random() * 100;
    b.speed = 0.5 + Math.random() * 0.4;
    b.hue   = HUE_START + (i * HUE_SPAN) / TOTAL;
    b.op    = 0.2 + Math.random() * 0.1;
  }

  function drawBeam(ctx: CanvasRenderingContext2D, b: Beam) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate((b.angle * Math.PI) / 180);
    const op = b.op * (0.8 + Math.sin(b.pulse) * 0.2);
    const g  = ctx.createLinearGradient(0, 0, 0, b.len);
    g.addColorStop(0,   `hsla(${b.hue},85%,65%,0)`);
    g.addColorStop(0.1, `hsla(${b.hue},85%,65%,${(op * 0.5).toFixed(3)})`);
    g.addColorStop(0.4, `hsla(${b.hue},85%,65%,${op.toFixed(3)})`);
    g.addColorStop(0.6, `hsla(${b.hue},85%,65%,${op.toFixed(3)})`);
    g.addColorStop(0.9, `hsla(${b.hue},85%,65%,${(op * 0.5).toFixed(3)})`);
    g.addColorStop(1,   `hsla(${b.hue},85%,65%,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-b.w / 2, 0, b.w, b.len);
    ctx.restore();
  }

  const ctx = canvas.getContext('2d')!;
  const beams = Array.from({ length: TOTAL }, mkBeam);

  (function loop() {
    if (!active) return;
    ctx.clearRect(0, 0, W(), H());
    ctx.filter = 'blur(35px)';   // V3 exact match
    beams.forEach((b, i) => {
      b.y     -= b.speed;
      b.pulse += b.ps;
      if (b.y + b.len < -100) resetBeam(b, i);
      drawBeam(ctx, b);
    });
    raf = requestAnimationFrame(loop);
  })();

  return () => {
    active = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]           = useState(false);
  const [showVerified, setShowVerified]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [emailSent, setEmailSent]         = useState(false);
  const [sentToEmail, setSentToEmail]     = useState('');
  const [showReset, setShowReset]         = useState(false);
  const beamsRef = useRef<HTMLDivElement>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg =
        error.message.includes('Invalid login') || error.message.includes('invalid_credentials')
          ? 'Incorrect email or password. Please try again.'
          : error.message.includes('Email not confirmed')
          ? 'Please confirm your email before signing in.'
          : 'Sign in failed. Please try again.';
      toast.error(msg);
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Enter your email address first, then tap Forgot password.');
      return;
    }
    setForgotLoading(true);
    // Use implicit client — PKCE client (@supabase/ssr) hardcodes flowType:'pkce'
    // which stores a code_verifier in PWA storage. That verifier is inaccessible
    // when the email link opens in Safari → "Link expired". Implicit flow sends
    // tokens in the URL hash instead, with no verifier requirement.
    const implicitClient = createImplicitClient();
    const { error } = await implicitClient.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      console.error('[ForgotPW] Supabase error:', error.message, error.status);
      toast.error(
        error.message.includes('rate limit') || error.message.includes('Rate limit')
          ? 'Too many requests. Please wait a minute and try again.'
          : error.message.includes('not allowed') || error.message.includes('redirect')
          ? 'Redirect URL not allowed — contact support.'
          : `Error: ${error.message}`   // Show real error during debug
      );
    } else {
      setSentToEmail(trimmed);
      setEmailSent(true);
    }
  }

  useEffect(() => {
    if (searchParams.get('verified') === '1')    setShowVerified(true);
    if (searchParams.get('reset') === '1')       setShowReset(true);
    if (searchParams.get('error') === 'reset_link_expired') {
      toast.error('Reset link has expired. Please request a new one.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!beamsRef.current) return;
    return startBeams(beamsRef.current);
  }, []);

  return (
    <div className="screen">
      {/* V3 BeamsBackground container */}
      <div ref={beamsRef} className="beams-bg" />

      {/* V3 pulsing overlay */}
      <div className="beams-pulse" aria-hidden />

      {/* V3 gradient overlay — punches a bright window in the centre */}
      <div className="spl-ov" aria-hidden />

      {/* V3 vignette ring */}
      <div className="spl-vign" aria-hidden />

      {/* Mini logo */}
      <div className="sign-top">
        <img
          src="/icons/icon-192.png"
          alt="PlanIQ"
          style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 10, boxShadow: '0 4px 20px rgba(108,99,255,0.4)' }}
        />
        <div className="sign-logo">Plan<span>IQ</span></div>
        <div className="sign-tag">Sign in to continue</div>
      </div>

      {/* ── Email sent confirmation ─────────────────────────── */}
      {emailSent && (
        <div className="email-sent-overlay">
          <div className="es-check">✓</div>
          <h2 className="es-title">Request sent</h2>
          <p className="es-body">
            Please check your email for the password reset link. If you don't see it, check your spam folder.
          </p>
          <button className="es-back" onClick={() => { setEmailSent(false); setEmail(''); }}>
            ← Back to Sign In
          </button>
        </div>
      )}

      {/* Glass bottom-sheet card */}
      <div className="sign-card" style={emailSent ? {display:'none'} : {}}>

        {/* Password reset success banner */}
        {showReset && (
          <div className="verified-banner" style={{ background: 'rgba(139,92,246,.15)', borderColor: 'rgba(139,92,246,.35)' }}>
            <span className="verified-icon">✓</span>
            <div>
              <div className="verified-title">Password updated!</div>
              <div className="verified-sub">Sign in with your new password below.</div>
            </div>
          </div>
        )}

        {/* Email verified banner — shown when redirected from signup confirmation */}
        {showVerified && (
          <div className="verified-banner">
            <span className="verified-icon">✓</span>
            <div>
              <div className="verified-title">Email verified!</div>
              <div className="verified-sub">You can now sign in to your account.</div>
            </div>
          </div>
        )}

        <div className="sign-card-hd">
          <div className="sign-card-title">{showVerified ? 'Sign in to continue' : 'Welcome back'}</div>
          <div className="sign-card-sub">{showVerified ? 'Your account is ready — enter your password below' : 'Enter your details to access your schedule'}</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="fg">
            <label className="flbl">Email Address</label>
            <input className="finp" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="fg" style={{ marginBottom: '4px' }}>
            <label className="flbl">Password</label>
            <input className="finp" type="password" placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button
            type="button"
            className="forgot"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
          >
            {forgotLoading ? 'Sending…' : 'Forgot password?'}
          </button>
          <button type="submit" className="spl-btn" disabled={loading}>
            {loading ? <span className="spin">⟳</span> : 'Sign In'}
          </button>
        </form>

        <div className="or-row">
          <div className="or-line" /><span className="or-txt">or</span><div className="or-line" />
        </div>

        <button className="g-btn" type="button" onClick={() => toast('Google Sign-In — coming soon!')}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="footer">
          New to PlanIQ?{' '}
          <Link href="/signup" style={{ color: '#C4B5FD', fontWeight: 700, textDecoration: 'none' }}>
            Create free account
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Link href="/privacy" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>·</span>
          <a href="mailto:privacy@emlabs.ph" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
            Contact
          </a>
        </div>
      </div>

      <style jsx>{`
        /* ── Screen base — V3 exact ── */
        .screen {
          position: fixed; inset: 0;
          background: #09070F;
          overflow: hidden;
        }

        /* ── Beams container — V3 exact ── */
        .beams-bg {
          position: absolute; inset: 0; z-index: 0;
          background: #09070F; overflow: hidden;
        }
        .beams-bg :global(canvas) {
          display: block;
          filter: blur(15px);           /* V3: element-level blur */
          position: absolute; inset: 0;
          width: 100% !important;
          height: 100% !important;
        }

        /* ── Pulsing overlay — V3 exact ── */
        .beams-pulse {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: rgba(9,7,15,0.08);
          animation: bPulse 10s ease-in-out infinite;
          backdrop-filter: blur(50px);
          -webkit-backdrop-filter: blur(50px);
        }
        @keyframes bPulse {
          0%, 100% { opacity: .05; }
          50%       { opacity: .15; }
        }

        /* ── Gradient overlay — V3 exact ── */
        .spl-ov {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 75% 50% at 50% 42%, transparent 30%, rgba(2,1,12,.72) 80%),
            linear-gradient(to bottom,
              rgba(2,1,12,.40)  0%,
              rgba(2,1,12,.05) 30%,
              rgba(2,1,12,.05) 55%,
              rgba(2,1,12,.72) 80%,
              rgba(2,1,12,.97) 100%);
        }

        /* ── Vignette ring — V3 exact ── */
        .spl-vign {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          box-shadow: inset 0 0 80px rgba(0,0,0,.55);
        }

        /* ── Mini logo ── */
        .sign-top {
          position: absolute; top: 52px; left: 0; right: 0; z-index: 5;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
        }
        .sign-logo {
          font-size: 32px; font-weight: 900; letter-spacing: -1.5px; color: #fff;
        }
        .sign-logo span { color: #C4B5FD; }
        .sign-tag { font-size: 13px; color: rgba(255,255,255,0.42); font-weight: 500; }

        /* ── Glass bottom-sheet card ── */
        .sign-card {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
          background: rgba(13,12,22,0.88);
          backdrop-filter: blur(32px) saturate(1.6);
          -webkit-backdrop-filter: blur(32px) saturate(1.6);
          border-top: 1px solid rgba(255,255,255,0.09);
          border-radius: 28px 28px 0 0;
          padding: 8px 24px env(safe-area-inset-bottom, 40px);
          padding-bottom: max(40px, env(safe-area-inset-bottom, 40px));
          box-shadow: 0 -24px 80px rgba(108,92,231,0.12);
        }
        .sign-card::before {
          content: ''; display: block;
          width: 40px; height: 4px;
          background: rgba(255,255,255,0.14);
          border-radius: 2px; margin: 10px auto 20px;
        }
        .sign-card-hd { margin-bottom: 20px; }
        .sign-card-title { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 5px; }
        .sign-card-sub   { font-size: 13px; color: rgba(255,255,255,0.42); line-height: 1.5; }

        /* ── Fields ── */
        .fg   { margin-bottom: 14px; }
        .flbl { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.48); margin-bottom: 6px; display: block; letter-spacing: .3px; }
        .finp {
          width: 100%; padding: 13px 15px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 13px; color: #fff; font-size: 15px; font-family: inherit;
          outline: none; transition: border-color .2s, background .2s;
          -webkit-appearance: none; box-sizing: border-box;
        }
        .finp:focus { border-color: rgba(167,139,250,0.6); background: rgba(255,255,255,0.11); }
        .finp::placeholder { color: rgba(255,255,255,0.22); }
        .forgot {
          display: block; width: 100%; text-align: right;
          font-size: 13px; color: #C4B5FD; font-weight: 600;
          background: none; border: none; font-family: inherit;
          cursor: pointer; padding: 10px 0; margin-bottom: 14px;
          min-height: 44px; /* iOS recommended tap target */
          line-height: 1; letter-spacing: .1px;
        }
        .forgot:disabled { opacity: .6; cursor: not-allowed; }

        /* ── Sign In button ── */
        .spl-btn {
          width: 100%; padding: 15px;
          background: rgba(108,92,231,0.80);
          border: 1px solid rgba(167,139,250,0.4);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(108,92,231,0.45), inset 0 1px 0 rgba(255,255,255,0.14);
          border-radius: 14px; color: #fff; font-size: 15px; font-weight: 700;
          font-family: inherit; cursor: pointer; transition: transform .15s, opacity .15s;
        }
        .spl-btn:active { transform: scale(.97); }
        .spl-btn:disabled { opacity: .6; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── OR divider ── */
        .or-row  { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
        .or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.10); }
        .or-txt  { font-size: 11px; color: rgba(255,255,255,0.28); font-weight: 600; }

        /* ── Google button ── */
        .g-btn {
          width: 100%; padding: 13px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 13px; color: rgba(255,255,255,0.70);
          font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: background .18s;
        }
        .g-btn:active { background: rgba(255,255,255,0.12); }

        .footer { text-align: center; font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 18px; }

        /* ── Email sent overlay ── */
        .email-sent-overlay {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 11;
          background: rgba(13,12,22,0.88);
          backdrop-filter: blur(32px) saturate(1.6);
          -webkit-backdrop-filter: blur(32px) saturate(1.6);
          border-top: 1px solid rgba(255,255,255,0.09);
          border-radius: 28px 28px 0 0;
          padding: 8px 24px max(40px,env(safe-area-inset-bottom,40px));
          box-shadow: 0 -24px 80px rgba(108,92,231,0.12);
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
        }
        .email-sent-overlay::before {
          content: ''; display: block; width: 40px; height: 4px;
          background: rgba(255,255,255,0.14); border-radius: 2px;
          margin: 10px auto 28px;
        }
        .es-check {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(139,92,246,0.18);
          border: 1.5px solid rgba(139,92,246,0.45);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; color: #A78BFA; font-weight: 700;
          margin-bottom: 18px;
        }
        .es-title { font-size: 21px; font-weight: 800; color: #fff; margin-bottom: 10px; letter-spacing: -.3px; }
        .es-body {
          font-size: 14px; color: rgba(255,255,255,0.48); line-height: 1.65;
          margin-bottom: 28px; max-width: 280px;
        }
        .es-back {
          width: 100%; background: none;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 15px;
          font-family: inherit; font-size: 14px; font-weight: 600;
          color: rgba(255,255,255,0.5); cursor: pointer;
          transition: background .18s;
        }
        .es-back:active { background: rgba(255,255,255,0.07); }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

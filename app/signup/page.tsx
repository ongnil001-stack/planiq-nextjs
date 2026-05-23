'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Account created! Check your email to confirm.');
      router.push('/dashboard');
      router.refresh();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const TOTAL = 18;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    type Beam = {
      x: number; y: number; w: number; h: number;
      color: string; opacity: number; speed: number; angle: number;
    };

    const COLORS = ['#7B6CF6','#5AABF0','#9B8FF8','#2DD4BF','#C4B5FD'];

    function mkBeam(): Beam {
      const w = canvas!.width;
      const h = canvas!.height;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        w: 80 + Math.random() * 160,
        h: 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.08 + Math.random() * 0.18,
        speed: 0.3 + Math.random() * 0.7,
        angle: -20 + Math.random() * 40,
      };
    }

    const beams: Beam[] = Array.from({ length: TOTAL }, mkBeam);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const b of beams) {
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y);
        ctx.rotate((b.angle * Math.PI) / 180);
        const grad = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, b.color);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = b.opacity;
        ctx.fillStyle = grad;
        ctx.filter = 'blur(8px)';
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();

        b.x += b.speed;
        if (b.x - b.w > canvas.width) {
          b.x = -b.w;
          b.y = Math.random() * canvas.height;
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="screen">
      {/* Beams canvas background */}
      <div className="beams-wrap">
        <canvas ref={canvasRef} className="beams-canvas" />
      </div>

      <div className="beams-pulse" aria-hidden />
      <div className="spl-ov" aria-hidden />
      <div className="spl-vign" aria-hidden />

      {/* Mini logo at top */}
      <div className="sign-top">
        <div className="sign-mini-logo">Plan<span>IQ</span></div>
        <div className="sign-mini-sub">Create your account</div>
      </div>

      {/* Glass bottom-sheet card */}
      <div className="sign-card">
        <div className="sign-card-hd">
          <div className="sign-card-title">Get started free</div>
          <div className="sign-card-sub">Start planning smarter — free forever</div>
        </div>

        <form onSubmit={handleSignup}>
          <div className="dark-fg">
            <label className="dark-lbl">Full Name</label>
            <input
              className="dark-inp"
              type="text"
              placeholder="Alex Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="dark-fg">
            <label className="dark-lbl">Email Address</label>
            <input
              className="dark-inp"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="dark-fg" style={{ marginBottom: '18px' }}>
            <label className="dark-lbl">Password</label>
            <input
              className="dark-inp"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <button type="submit" className="spl-btn" disabled={loading}>
            {loading ? <span className="btn-spin">⟳</span> : 'Create Account'}
          </button>
        </form>

        <div className="dark-or">
          <div className="dark-or-line" />
          <span className="dark-or-txt">or</span>
          <div className="dark-or-line" />
        </div>

        <button
          className="sign-g-btn"
          type="button"
          onClick={() => toast('Google Sign-Up — coming soon!')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="sign-create">
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#C4B5FD', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>

        <div className="sign-terms">
          By signing up, you agree to our{' '}
          <a href="/privacy-policy" style={{ color: '#C4B5FD', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </div>

      <style jsx>{`
        .screen {
          position: fixed;
          inset: 0;
          background: #09070F;
          overflow: hidden;
        }
        .beams-wrap {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: #09070F;
          overflow: hidden;
        }
        .beams-canvas {
          display: block;
          width: 100%;
          height: 100%;
          filter: blur(10px);
        }
        .beams-pulse {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: rgba(9,7,15,0.08);
          animation: bPulse 10s ease-in-out infinite;
          backdrop-filter: blur(50px);
          -webkit-backdrop-filter: blur(50px);
        }
        @keyframes bPulse {
          0%, 100% { opacity: .05; }
          50% { opacity: .15; }
        }
        .spl-ov {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(ellipse 75% 50% at 50% 42%, transparent 30%, rgba(2,1,12,.72) 80%),
            linear-gradient(to bottom,
              rgba(2,1,12,.40) 0%,
              rgba(2,1,12,.05) 30%,
              rgba(2,1,12,.05) 55%,
              rgba(2,1,12,.72) 80%,
              rgba(2,1,12,.97) 100%);
        }
        .spl-vign {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          box-shadow: inset 0 0 80px rgba(0,0,0,.55);
        }
        .sign-top {
          position: absolute;
          top: 44px;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          z-index: 5;
          padding-top: 14px;
        }
        .sign-mini-logo {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -1.5px;
          color: #fff;
        }
        .sign-mini-logo span { color: #C4B5FD; }
        .sign-mini-sub {
          font-size: 13px;
          color: rgba(255,255,255,.42);
          font-weight: 500;
        }
        .sign-card {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(15,14,23,.85);
          backdrop-filter: blur(32px) saturate(1.5);
          -webkit-backdrop-filter: blur(32px) saturate(1.5);
          border-top: 1px solid rgba(255,255,255,.09);
          border-radius: 28px 28px 0 0;
          padding: 26px 22px 38px;
          z-index: 5;
        }
        .sign-card::before {
          content: '';
          display: block;
          width: 40px;
          height: 4px;
          background: rgba(255,255,255,.14);
          border-radius: 2px;
          margin: 0 auto 20px;
        }
        .sign-card-hd { margin-bottom: 18px; }
        .sign-card-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 4px;
        }
        .sign-card-sub {
          font-size: 13px;
          color: rgba(255,255,255,.42);
          font-weight: 500;
        }
        .dark-fg { margin-bottom: 12px; }
        .dark-lbl {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,.48);
          margin-bottom: 6px;
          display: block;
          letter-spacing: .3px;
        }
        .dark-inp {
          width: 100%;
          padding: 13px 15px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 13px;
          color: #fff;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color .2s, background .2s;
          -webkit-appearance: none;
          box-sizing: border-box;
        }
        .dark-inp:focus {
          border-color: rgba(167,139,250,.6);
          background: rgba(255,255,255,.11);
        }
        .dark-inp::placeholder { color: rgba(255,255,255,.22); }
        .spl-btn {
          width: 100%;
          padding: 15px;
          background: rgba(108,92,231,.72);
          border: 1px solid rgba(167,139,250,.4);
          backdrop-filter: blur(16px);
          box-shadow:
            0 8px 32px rgba(108,92,231,.45),
            inset 0 1px 0 rgba(255,255,255,.14);
          border-radius: 14px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: transform .15s, opacity .15s;
        }
        .spl-btn:active { transform: scale(.97); }
        .spl-btn:disabled { opacity: .6; cursor: not-allowed; }
        .btn-spin { display: inline-block; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dark-or {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 14px 0;
        }
        .dark-or-line { flex: 1; height: 1px; background: rgba(255,255,255,.1); }
        .dark-or-txt { font-size: 11px; color: rgba(255,255,255,.3); font-weight: 600; }
        .sign-g-btn {
          width: 100%;
          padding: 13px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 13px;
          color: rgba(255,255,255,.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          transition: background .18s;
        }
        .sign-g-btn:active { background: rgba(255,255,255,.12); }
        .sign-create {
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,.35);
          font-weight: 500;
          margin-top: 16px;
        }
        .sign-terms {
          text-align: center;
          font-size: 11px;
          color: rgba(255,255,255,.25);
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}

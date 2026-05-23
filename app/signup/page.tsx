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
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
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

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    type Star = { x: number; y: number; r: number; dx: number; dy: number; alpha: number; da: number; color: string };
    const starColors = ['rgba(167,139,250,', 'rgba(124,106,240,', 'rgba(90,171,240,', 'rgba(255,255,255,'];
    const stars: Star[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.6 + 0.15,
      da: (Math.random() - 0.5) * 0.006,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    type Beam = { x: number; y: number; w: number; h: number; color: string; opacity: number; speed: number; angle: number };
    const beamColors = ['#7B6CF6', '#5AABF0', '#9B8FF8', '#C4B5FD', '#A78BFA'];
    const beams: Beam[] = Array.from({ length: 14 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * 0.65,
      w: 120 + Math.random() * 200,
      h: 2 + Math.random() * 5,
      color: beamColors[Math.floor(Math.random() * beamColors.length)],
      opacity: 0.12 + Math.random() * 0.22,
      speed: 0.4 + Math.random() * 0.8,
      angle: -15 + Math.random() * 30,
    }));

    type Orb = { x: number; y: number; r: number; dx: number; dy: number; color: string; alpha: number };
    const orbs: Orb[] = [
      { x: 0.3 * window.innerWidth,  y: 0.20 * window.innerHeight, r: 170, color: '#6C5CE7', alpha: 0.18, dx: 0.14, dy: 0.07 },
      { x: 0.72 * window.innerWidth, y: 0.32 * window.innerHeight, r: 130, color: '#5AABF0', alpha: 0.12, dx: -0.11, dy: 0.09 },
      { x: 0.50 * window.innerWidth, y: 0.12 * window.innerHeight, r: 90,  color: '#A78BFA', alpha: 0.14, dx: 0.07,  dy: -0.06 },
    ];

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#09070F';
      ctx.fillRect(0, 0, W, H);

      for (const orb of orbs) {
        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        g.addColorStop(0, orb.color + 'AA'); g.addColorStop(1, orb.color + '00');
        ctx.globalAlpha = orb.alpha; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        orb.x += orb.dx; orb.y += orb.dy;
        if (orb.x < -orb.r || orb.x > W + orb.r) orb.dx *= -1;
        if (orb.y < -orb.r || orb.y > H * 0.6 + orb.r) orb.dy *= -1;
      }

      for (const b of beams) {
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y);
        ctx.rotate((b.angle * Math.PI) / 180);
        const g = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
        g.addColorStop(0, 'transparent'); g.addColorStop(0.5, b.color); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = b.opacity; ctx.fillStyle = g;
        ctx.filter = 'blur(6px)';
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
        b.x += b.speed;
        if (b.x - b.w > W) { b.x = -b.w; b.y = Math.random() * H * 0.6; }
      }

      ctx.filter = 'none';
      for (const s of stars) {
        s.x += s.dx; s.y += s.dy; s.alpha += s.da;
        if (s.alpha <= 0.08 || s.alpha >= 0.85) s.da *= -1;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color + s.alpha + ')'; ctx.fill();
        if (s.r > 1.2) {
          ctx.beginPath();
          ctx.moveTo(s.x - s.r * 2.5, s.y); ctx.lineTo(s.x + s.r * 2.5, s.y);
          ctx.moveTo(s.x, s.y - s.r * 2.5); ctx.lineTo(s.x, s.y + s.r * 2.5);
          ctx.strokeStyle = s.color + (s.alpha * 0.5) + ')'; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="screen">
      <canvas ref={canvasRef} className="bg-canvas" />
      <div className="vignette" aria-hidden />
      <div className="bottom-fade" aria-hidden />

      <div className="sign-top">
        <div className="sign-mini-logo">Plan<span>IQ</span></div>
        <div className="sign-mini-sub">Create your account</div>
      </div>

      <div className="sign-card">
        <div className="sign-card-hd">
          <div className="sign-card-title">Get started free</div>
          <div className="sign-card-sub">Start planning smarter — free forever</div>
        </div>

        <form onSubmit={handleSignup}>
          <div className="dark-fg">
            <label className="dark-lbl">Full Name</label>
            <input className="dark-inp" type="text" placeholder="Alex Rivera"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="dark-fg">
            <label className="dark-lbl">Email Address</label>
            <input className="dark-inp" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="dark-fg" style={{ marginBottom: '18px' }}>
            <label className="dark-lbl">Password</label>
            <input className="dark-inp" type="password" placeholder="Min 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
          </div>
          <button type="submit" className="spl-btn" disabled={loading}>
            {loading ? <span className="btn-spin">⟳</span> : 'Create Account'}
          </button>
        </form>

        <div className="dark-or">
          <div className="dark-or-line" /><span className="dark-or-txt">or</span><div className="dark-or-line" />
        </div>

        <button className="sign-g-btn" type="button" onClick={() => toast('Google Sign-Up — coming soon!')}>
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
          <Link href="/login" style={{ color: '#C4B5FD', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </div>
        <div className="sign-terms">
          By signing up, you agree to our{' '}
          <a href="#" style={{ color: '#C4B5FD', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </div>

      <style jsx>{`
        .screen { position: fixed; inset: 0; overflow: hidden; background: #09070F; }
        .bg-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 0; }
        .vignette {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          box-shadow: inset 0 0 120px rgba(0,0,0,0.65);
          background: radial-gradient(ellipse 80% 60% at 50% 30%, transparent 40%, rgba(5,3,15,0.55) 85%);
        }
        .bottom-fade {
          position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
          z-index: 1; pointer-events: none;
          background: linear-gradient(to bottom, transparent 0%, rgba(9,7,15,0.70) 50%, rgba(9,7,15,0.95) 100%);
        }
        .sign-top { position: absolute; top: 52px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 5px; z-index: 5; }
        .sign-mini-logo { font-size: 32px; font-weight: 900; letter-spacing: -1.5px; color: #fff; }
        .sign-mini-logo span { color: #C4B5FD; }
        .sign-mini-sub { font-size: 13px; color: rgba(255,255,255,0.42); font-weight: 500; }
        .sign-card {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: rgba(13,12,22,0.88);
          backdrop-filter: blur(32px) saturate(1.6);
          -webkit-backdrop-filter: blur(32px) saturate(1.6);
          border-top: 1px solid rgba(255,255,255,0.09);
          border-radius: 28px 28px 0 0;
          padding: 10px 22px 38px; z-index: 10;
          box-shadow: 0 -24px 80px rgba(108,92,231,0.12);
        }
        .sign-card::before {
          content: ''; display: block; width: 40px; height: 4px;
          background: rgba(255,255,255,0.14); border-radius: 2px; margin: 10px auto 18px;
        }
        .sign-card-hd { margin-bottom: 16px; }
        .sign-card-title { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .sign-card-sub { font-size: 13px; color: rgba(255,255,255,0.42); }
        .dark-fg { margin-bottom: 12px; }
        .dark-lbl { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.48); margin-bottom: 6px; display: block; letter-spacing: .3px; }
        .dark-inp {
          width: 100%; padding: 13px 15px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.11);
          border-radius: 13px; color: #fff; font-size: 15px; font-family: inherit;
          outline: none; transition: border-color .2s, background .2s;
          -webkit-appearance: none; box-sizing: border-box;
        }
        .dark-inp:focus { border-color: rgba(167,139,250,0.6); background: rgba(255,255,255,0.11); }
        .dark-inp::placeholder { color: rgba(255,255,255,0.22); }
        .spl-btn {
          width: 100%; padding: 15px;
          background: rgba(108,92,231,0.80); border: 1px solid rgba(167,139,250,0.4);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(108,92,231,0.45), inset 0 1px 0 rgba(255,255,255,0.14);
          border-radius: 14px; color: #fff; font-size: 15px; font-weight: 700;
          font-family: inherit; cursor: pointer; transition: transform .15s, opacity .15s;
        }
        .spl-btn:active { transform: scale(.97); }
        .spl-btn:disabled { opacity: .6; cursor: not-allowed; }
        .btn-spin { display: inline-block; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dark-or { display: flex; align-items: center; gap: 10px; margin: 14px 0; }
        .dark-or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.10); }
        .dark-or-txt { font-size: 11px; color: rgba(255,255,255,0.28); font-weight: 600; }
        .sign-g-btn {
          width: 100%; padding: 13px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.11);
          border-radius: 13px; color: rgba(255,255,255,0.70); font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: background .18s;
        }
        .sign-g-btn:active { background: rgba(255,255,255,0.12); }
        .sign-create { text-align: center; font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 16px; }
        .sign-terms { text-align: center; font-size: 11px; color: rgba(255,255,255,0.22); margin-top: 10px; }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

/* ─── V3 BeamsBackground engine ─────────────────────────────── */
function startBeams(container: HTMLDivElement): () => void {
  const TOTAL = 30, HUE_START = 230, HUE_SPAN = 60;
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  let active = true, raf = 0;

  function resize() {
    canvas.width  = container.offsetWidth  || window.innerWidth;
    canvas.height = container.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  const W = () => canvas.width, H = () => canvas.height;

  type Beam = { x:number;y:number;w:number;len:number;angle:number;speed:number;op:number;hue:number;pulse:number;ps:number };
  const mkBeam = (): Beam => ({
    x: Math.random()*W()*1.5 - W()*0.25,
    y: Math.random()*H()*1.5 - H()*0.25,
    w: 30 + Math.random()*60, len: H()*2.5,
    angle: -35 + Math.random()*10, speed: 0.6 + Math.random()*1.2,
    op: 0.12 + Math.random()*0.16, hue: HUE_START + Math.random()*HUE_SPAN,
    pulse: Math.random()*Math.PI*2, ps: 0.02 + Math.random()*0.03,
  });
  const resetBeam = (b: Beam, i: number) => {
    const sp = W()/3, col = i%3;
    b.y=H()+100; b.x=col*sp+sp/2+(Math.random()-.5)*sp*0.5;
    b.w=100+Math.random()*100; b.speed=0.5+Math.random()*0.4;
    b.hue=HUE_START+(i*HUE_SPAN)/TOTAL; b.op=0.2+Math.random()*0.1;
  };
  const drawBeam = (ctx: CanvasRenderingContext2D, b: Beam) => {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle*Math.PI/180);
    const op = b.op*(0.8+Math.sin(b.pulse)*0.2);
    const g  = ctx.createLinearGradient(0,0,0,b.len);
    g.addColorStop(0,   `hsla(${b.hue},85%,65%,0)`);
    g.addColorStop(0.1, `hsla(${b.hue},85%,65%,${(op*.5).toFixed(3)})`);
    g.addColorStop(0.4, `hsla(${b.hue},85%,65%,${op.toFixed(3)})`);
    g.addColorStop(0.6, `hsla(${b.hue},85%,65%,${op.toFixed(3)})`);
    g.addColorStop(0.9, `hsla(${b.hue},85%,65%,${(op*.5).toFixed(3)})`);
    g.addColorStop(1,   `hsla(${b.hue},85%,65%,0)`);
    ctx.fillStyle=g; ctx.fillRect(-b.w/2,0,b.w,b.len); ctx.restore();
  };
  const ctx = canvas.getContext('2d')!;
  const beams = Array.from({length:TOTAL}, mkBeam);
  (function loop() {
    if (!active) return;
    ctx.clearRect(0,0,W(),H()); ctx.filter='blur(35px)';
    beams.forEach((b,i) => { b.y-=b.speed; b.pulse+=b.ps; if(b.y+b.len<-100) resetBeam(b,i); drawBeam(ctx,b); });
    raf=requestAnimationFrame(loop);
  })();
  return () => { active=false; cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const beamsRef = useRef<HTMLDivElement>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Please enter your full name.'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (error) {
      // Show a friendly error — never expose raw Supabase messages
      const msg =
        error.message.includes('already registered') || error.message.includes('already exists')
          ? 'An account with this email already exists. Try signing in instead.'
          : error.message.includes('password')
          ? 'Password is too weak. Try a longer or more complex password.'
          : error.message.includes('email')
          ? 'Please enter a valid email address.'
          : 'Something went wrong. Please try again.';
      toast.error(msg);
      setLoading(false);
      return;
    }

    // Option B: email confirmation is OFF in Supabase.
    // data.session is non-null → user is instantly logged in.
    if (data.session) {
      // Upsert profile row (in case trigger didn't fire)
      await supabase.from('profiles').upsert({
        id: data.session.user.id,
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
      }, { onConflict: 'id' });

      toast.success(`Welcome to PlanIQ, ${fullName.split(' ')[0]}! 🎉`);
      router.push('/dashboard');
      router.refresh();
    } else {
      // This only happens if email confirmation is ON — guide them gently
      toast.success('Account created! Check your email to confirm, then sign in.');
      router.push('/login?verified=1');
    }
  }

  useEffect(() => {
    if (!beamsRef.current) return;
    return startBeams(beamsRef.current);
  }, []);

  return (
    <div className="screen">
      {/* V3 BeamsBackground */}
      <div ref={beamsRef} className="beams-bg" />

      {/* V3 pulsing overlay */}
      <div className="beams-pulse" aria-hidden />

      {/* V3 gradient overlay */}
      <div className="spl-ov" aria-hidden />

      {/* V3 vignette */}
      <div className="spl-vign" aria-hidden />

      {/* Mini logo */}
      <div className="sign-top">
        <div className="sign-logo">Plan<span>IQ</span></div>
        <div className="sign-tag">Create your account</div>
      </div>

      {/* Glass bottom-sheet card */}
      <div className="sign-card">
        <div className="sign-card-hd">
          <div className="sign-card-title">Get started free</div>
          <div className="sign-card-sub">Start planning smarter — free forever</div>
        </div>

        <form onSubmit={handleSignup}>
          <div className="fg">
            <label className="flbl">Full Name</label>
            <input className="finp" type="text" placeholder="Alex Rivera"
              value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="fg">
            <label className="flbl">Email Address</label>
            <input className="finp" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="fg" style={{ marginBottom: '18px' }}>
            <label className="flbl">Password</label>
            <input className="finp" type="password" placeholder="Min 8 characters"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
          </div>
          <button type="submit" className="spl-btn" disabled={loading}>
            {loading ? <span className="spin">⟳</span> : 'Create Account'}
          </button>
        </form>

        <div className="or-row">
          <div className="or-line" /><span className="or-txt">or</span><div className="or-line" />
        </div>

        <button className="g-btn" type="button" onClick={() => toast('Google Sign-Up — coming soon!')}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="footer">
          Already have an account?{' '}
          <Link href="/login" style={{ color:'#C4B5FD', fontWeight:700, textDecoration:'none' }}>Sign in</Link>
        </div>
        <div className="terms">
          By signing up you agree to our{' '}
          <a href="#" style={{ color:'#C4B5FD', textDecoration:'none' }}>Privacy Policy</a>
        </div>
      </div>

      <style jsx>{`
        .screen { position:fixed; inset:0; background:#09070F; overflow:hidden; }

        .beams-bg { position:absolute; inset:0; z-index:0; background:#09070F; overflow:hidden; }
        .beams-bg :global(canvas) {
          display:block; filter:blur(15px);
          position:absolute; inset:0;
          width:100%!important; height:100%!important;
        }

        .beams-pulse {
          position:absolute; inset:0; z-index:1; pointer-events:none;
          background:rgba(9,7,15,0.08);
          animation:bPulse 10s ease-in-out infinite;
          backdrop-filter:blur(50px); -webkit-backdrop-filter:blur(50px);
        }
        @keyframes bPulse { 0%,100%{opacity:.05;} 50%{opacity:.15;} }

        .spl-ov {
          position:absolute; inset:0; z-index:1; pointer-events:none;
          background:
            radial-gradient(ellipse 75% 50% at 50% 42%, transparent 30%, rgba(2,1,12,.72) 80%),
            linear-gradient(to bottom,
              rgba(2,1,12,.40)  0%, rgba(2,1,12,.05) 30%,
              rgba(2,1,12,.05) 55%, rgba(2,1,12,.72) 80%,
              rgba(2,1,12,.97) 100%);
        }
        .spl-vign { position:absolute; inset:0; z-index:2; pointer-events:none; box-shadow:inset 0 0 80px rgba(0,0,0,.55); }

        .sign-top { position:absolute; top:52px; left:0; right:0; z-index:5; display:flex; flex-direction:column; align-items:center; gap:5px; }
        .sign-logo { font-size:32px; font-weight:900; letter-spacing:-1.5px; color:#fff; }
        .sign-logo span { color:#C4B5FD; }
        .sign-tag  { font-size:13px; color:rgba(255,255,255,0.42); font-weight:500; }

        .sign-card {
          position:absolute; bottom:0; left:0; right:0; z-index:10;
          background:rgba(13,12,22,0.88);
          backdrop-filter:blur(32px) saturate(1.6);
          -webkit-backdrop-filter:blur(32px) saturate(1.6);
          border-top:1px solid rgba(255,255,255,0.09);
          border-radius:28px 28px 0 0;
          padding:10px 22px 36px;
          box-shadow:0 -24px 80px rgba(108,92,231,0.12);
        }
        .sign-card::before {
          content:''; display:block; width:40px; height:4px;
          background:rgba(255,255,255,0.14); border-radius:2px; margin:10px auto 16px;
        }
        .sign-card-hd { margin-bottom:14px; }
        .sign-card-title { font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; }
        .sign-card-sub   { font-size:13px; color:rgba(255,255,255,0.42); }

        .fg   { margin-bottom:11px; }
        .flbl { font-size:12px; font-weight:700; color:rgba(255,255,255,0.48); margin-bottom:5px; display:block; letter-spacing:.3px; }
        .finp {
          width:100%; padding:12px 15px;
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.11);
          border-radius:13px; color:#fff; font-size:15px; font-family:inherit;
          outline:none; transition:border-color .2s, background .2s;
          -webkit-appearance:none; box-sizing:border-box;
        }
        .finp:focus { border-color:rgba(167,139,250,0.6); background:rgba(255,255,255,0.11); }
        .finp::placeholder { color:rgba(255,255,255,0.22); }

        .spl-btn {
          width:100%; padding:15px;
          background:rgba(108,92,231,0.80); border:1px solid rgba(167,139,250,0.4);
          backdrop-filter:blur(16px);
          box-shadow:0 8px 32px rgba(108,92,231,0.45), inset 0 1px 0 rgba(255,255,255,0.14);
          border-radius:14px; color:#fff; font-size:15px; font-weight:700;
          font-family:inherit; cursor:pointer; transition:transform .15s, opacity .15s;
        }
        .spl-btn:active { transform:scale(.97); }
        .spl-btn:disabled { opacity:.6; cursor:not-allowed; }
        .spin { display:inline-block; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .or-row  { display:flex; align-items:center; gap:10px; margin:12px 0; }
        .or-line { flex:1; height:1px; background:rgba(255,255,255,0.10); }
        .or-txt  { font-size:11px; color:rgba(255,255,255,0.28); font-weight:600; }

        .g-btn {
          width:100%; padding:13px;
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.11);
          border-radius:13px; color:rgba(255,255,255,0.70); font-size:14px; font-weight:600;
          cursor:pointer; font-family:inherit;
          display:flex; align-items:center; justify-content:center; gap:9px;
          transition:background .18s;
        }
        .g-btn:active { background:rgba(255,255,255,0.12); }

        .footer { text-align:center; font-size:13px; color:rgba(255,255,255,0.35); margin-top:14px; }
        .terms  { text-align:center; font-size:11px; color:rgba(255,255,255,0.20); margin-top:8px; }
      `}</style>
    </div>
  );
}

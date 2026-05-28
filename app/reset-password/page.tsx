'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/* ─── V3 BeamsBackground ─────────────────────────────────────── */
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
  const mk = (): Beam => ({ x:Math.random()*W()*1.5-W()*.25, y:Math.random()*H()*1.5-H()*.25, w:30+Math.random()*60, len:H()*2.5, angle:-35+Math.random()*10, speed:.6+Math.random()*1.2, op:.12+Math.random()*.16, hue:HUE_START+Math.random()*HUE_SPAN, pulse:Math.random()*Math.PI*2, ps:.02+Math.random()*.03 });
  const rb = (b: Beam, i: number) => { const sp=W()/3,col=i%3; b.y=H()+100; b.x=col*sp+sp/2+(Math.random()-.5)*sp*.5; b.w=100+Math.random()*100; b.speed=.5+Math.random()*.4; b.hue=HUE_START+(i*HUE_SPAN)/TOTAL; b.op=.2+Math.random()*.1; };
  const db = (ctx: CanvasRenderingContext2D, b: Beam) => { ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.angle*Math.PI/180); const op=b.op*(.8+Math.sin(b.pulse)*.2); const g=ctx.createLinearGradient(0,0,0,b.len); g.addColorStop(0,`hsla(${b.hue},85%,65%,0)`); g.addColorStop(.1,`hsla(${b.hue},85%,65%,${(op*.5).toFixed(3)})`); g.addColorStop(.4,`hsla(${b.hue},85%,65%,${op.toFixed(3)})`); g.addColorStop(.6,`hsla(${b.hue},85%,65%,${op.toFixed(3)})`); g.addColorStop(.9,`hsla(${b.hue},85%,65%,${(op*.5).toFixed(3)})`); g.addColorStop(1,`hsla(${b.hue},85%,65%,0)`); ctx.fillStyle=g; ctx.fillRect(-b.w/2,0,b.w,b.len); ctx.restore(); };
  const ctx = canvas.getContext('2d')!;
  const beams = Array.from({length:TOTAL}, mk);
  (function loop() { if(!active) return; ctx.clearRect(0,0,W(),H()); ctx.filter='blur(35px)'; beams.forEach((b,i)=>{ b.y-=b.speed; b.pulse+=b.ps; if(b.y+b.len<-100) rb(b,i); db(ctx,b); }); raf=requestAnimationFrame(loop); })();
  return () => { active=false; cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const beamsRef = useRef<HTMLDivElement>(null);

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    if (!beamsRef.current) return;
    return startBeams(beamsRef.current);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(
        updateError.message.includes('same password')
          ? 'Your new password must be different from the current one.'
          : 'Could not update password. The reset link may have expired — request a new one.'
      );
    } else {
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login?reset=1'), 2500);
    }
  }

  /* ── SUCCESS ── */
  if (done) {
    return (
      <div className="screen">
        <div ref={beamsRef} className="beams-bg" />
        <div className="spl-ov" aria-hidden />
        <div className="success-wrap">
          <div className="s-check">✓</div>
          <h2 className="s-title">Password updated successfully.</h2>
          <p className="s-sub">Redirecting you to the login screen…</p>
        </div>
        <style jsx>{`
          .screen{position:fixed;inset:0;background:#09070F;overflow:hidden;display:flex;align-items:center;justify-content:center;}
          .beams-bg{position:absolute;inset:0;z-index:0;background:#09070F;overflow:hidden;}
          .beams-bg :global(canvas){display:block;filter:blur(15px);position:absolute;inset:0;width:100%!important;height:100%!important;}
          .spl-ov{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse 75% 50% at 50% 42%,transparent 30%,rgba(2,1,12,.72) 80%),linear-gradient(to bottom,rgba(2,1,12,.4) 0%,rgba(2,1,12,.05) 30%,rgba(2,1,12,.97) 100%);}
          .success-wrap{position:relative;z-index:5;display:flex;flex-direction:column;align-items:center;gap:14px;padding:0 32px;text-align:center;}
          .s-check{width:64px;height:64px;border-radius:50%;background:rgba(139,92,246,.18);border:1.5px solid rgba(139,92,246,.45);display:flex;align-items:center;justify-content:center;font-size:26px;color:#A78BFA;font-weight:700;animation:pop .4s cubic-bezier(.34,1.56,.64,1);}
          @keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
          .s-title{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.3px;}
          .s-sub{font-size:14px;color:rgba(255,255,255,.4);line-height:1.6;}
        `}</style>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="screen">
      <div ref={beamsRef} className="beams-bg" />
      <div className="beams-pulse" aria-hidden />
      <div className="spl-ov"   aria-hidden />
      <div className="spl-vign" aria-hidden />

      {/* Logo */}
      <div className="top-logo">
        <img src="/icons/icon-192.png" alt="PlanIQ" className="logo-img" />
        <div className="logo-name">Plan<span>IQ</span></div>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">Set new password</div>
          <div className="card-sub">Enter and confirm your new password below.</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="flbl">New Password</label>
            <input
              className="finp"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="fg">
            <label className="flbl">Confirm Password</label>
            <input
              className="finp"
              type="password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <div className="err-msg">{error}</div>}

          <button type="submit" className="spl-btn" disabled={loading}>
            {loading ? <span className="spin">⟳</span> : 'Update Password'}
          </button>
        </form>

        <button className="back-btn" type="button" onClick={() => router.push('/login')}>
          ← Back to Sign In
        </button>
      </div>

      <style jsx>{`
        .screen{position:fixed;inset:0;background:#09070F;overflow:hidden;}
        .beams-bg{position:absolute;inset:0;z-index:0;background:#09070F;overflow:hidden;}
        .beams-bg :global(canvas){display:block;filter:blur(15px);position:absolute;inset:0;width:100%!important;height:100%!important;}
        .beams-pulse{position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(9,7,15,.08);animation:bPulse 10s ease-in-out infinite;backdrop-filter:blur(50px);-webkit-backdrop-filter:blur(50px);}
        @keyframes bPulse{0%,100%{opacity:.05}50%{opacity:.15}}
        .spl-ov{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse 75% 50% at 50% 42%,transparent 30%,rgba(2,1,12,.72) 80%),linear-gradient(to bottom,rgba(2,1,12,.4) 0%,rgba(2,1,12,.05) 30%,rgba(2,1,12,.05) 55%,rgba(2,1,12,.72) 80%,rgba(2,1,12,.97) 100%);}
        .spl-vign{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 80px rgba(0,0,0,.55);}

        .top-logo{position:absolute;top:52px;left:0;right:0;z-index:5;display:flex;flex-direction:column;align-items:center;gap:5px;}
        .logo-img{width:64px;height:64px;border-radius:16px;box-shadow:0 4px 20px rgba(108,99,255,.4);}
        .logo-name{font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff;}
        .logo-name span{color:#C4B5FD;}

        .card{position:absolute;bottom:0;left:0;right:0;z-index:10;background:rgba(13,12,22,.88);backdrop-filter:blur(32px) saturate(1.6);-webkit-backdrop-filter:blur(32px) saturate(1.6);border-top:1px solid rgba(255,255,255,.09);border-radius:28px 28px 0 0;padding:8px 24px max(40px,env(safe-area-inset-bottom,40px));box-shadow:0 -24px 80px rgba(108,92,231,.12);}
        .card::before{content:'';display:block;width:40px;height:4px;background:rgba(255,255,255,.14);border-radius:2px;margin:10px auto 22px;}
        .card-hd{margin-bottom:22px;}
        .card-title{font-size:22px;font-weight:800;color:#fff;margin-bottom:5px;}
        .card-sub{font-size:13px;color:rgba(255,255,255,.42);line-height:1.5;}

        .fg{margin-bottom:16px;}
        .flbl{font-size:12px;font-weight:700;color:rgba(255,255,255,.48);margin-bottom:6px;display:block;letter-spacing:.3px;}
        .finp{width:100%;padding:13px 15px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.11);border-radius:13px;color:#fff;font-size:15px;font-family:inherit;outline:none;transition:border-color .2s,background .2s;-webkit-appearance:none;box-sizing:border-box;}
        .finp:focus{border-color:rgba(167,139,250,.6);background:rgba(255,255,255,.11);}
        .finp::placeholder{color:rgba(255,255,255,.22);}

        .err-msg{font-size:13px;color:#F87171;font-weight:600;margin-bottom:14px;padding:12px 14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;}

        .spl-btn{width:100%;padding:15px;background:rgba(108,92,231,.80);border:1px solid rgba(167,139,250,.4);backdrop-filter:blur(16px);box-shadow:0 8px 32px rgba(108,92,231,.45),inset 0 1px 0 rgba(255,255,255,.14);border-radius:14px;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;transition:transform .15s,opacity .15s;}
        .spl-btn:active{transform:scale(.97);}
        .spl-btn:disabled{opacity:.6;cursor:not-allowed;}
        .spin{display:inline-block;animation:spin .8s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .back-btn{width:100%;background:none;border:none;font-family:inherit;font-size:13px;color:rgba(255,255,255,.35);cursor:pointer;padding:16px 0 0;font-weight:600;text-align:center;}
        .back-btn:active{color:rgba(255,255,255,.55);}
      `}</style>
    </div>
  );
}

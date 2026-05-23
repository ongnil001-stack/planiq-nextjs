'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─── V3 BeamsBackground engine (shared with login) ─────────── */
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

/* ─── V3 Sparkles engine (Get Started screen) ───────────────── */
function startSparkles(canvas: HTMLCanvasElement): () => void {
  let active = true, raf = 0;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const CX = canvas.width / 2;
  const LINE_Y = canvas.height * 0.585; // horizon line position (V3 ~494/844)

  type Pt = { x:number;y:number;r:number;o:number;od:number;vy:number };
  const mkPt = (): Pt => {
    const ang  = (Math.random()-.5)*Math.PI*1.55;
    const dist = Math.pow(Math.random(),.52)*185;
    return {
      x:  CX + Math.sin(ang)*dist*1.4,
      y:  LINE_Y + Math.max(0,Math.cos(ang))*dist*0.48 + Math.random()*35,
      r:  Math.random()*1.35+0.2,
      o:  Math.random(),
      od: (Math.random()>.5?1:-1)*(Math.random()*0.018+0.005),
      vy: -(Math.random()*0.22+0.04),
    };
  };
  const pts: Pt[] = Array.from({length:220}, mkPt);
  const ctx = canvas.getContext('2d')!;
  (function loop() {
    if (!active) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p => {
      p.o+=p.od;
      if(p.o>=1){p.o=1; p.od=-Math.abs(p.od);}
      if(p.o<=0){p.o=0; p.od= Math.abs(p.od);}
      p.y+=p.vy;
      if(p.y<LINE_Y-12){ const np=mkPt(); p.x=np.x;p.y=np.y;p.r=np.r;p.o=0;p.od=Math.abs(p.od); }
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${p.o.toFixed(3)})`; ctx.fill();
    });
    raf=requestAnimationFrame(loop);
  })();
  return () => { active=false; cancelAnimationFrame(raf); };
}

const SLIDES = [
  { title:'Plan Smarter,\nNot Harder',    desc:'PlanIQ organises your day with intelligent scheduling that adapts to your energy, priorities, and goals.' },
  { title:'AI That\nWorks For You',        desc:'Claude AI analyses your workload in real-time — spotting overloads, conflicts, and opportunities before they happen.' },
  { title:'Stay Balanced,\nStay On Track', desc:'Visual workload scores, streak tracking, and weekly insights keep you productive without burning out.' },
];

export default function SplashPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro'|number>('intro');

  const beamsRef   = useRef<HTMLDivElement>(null);
  const sparkRef   = useRef<HTMLCanvasElement>(null);
  const obBeamsRef = useRef<HTMLDivElement>(null);

  // Get Started screen — sparkles
  useEffect(() => {
    if (step !== 'intro' || !sparkRef.current) return;
    return startSparkles(sparkRef.current);
  }, [step]);

  // Sign In screen reuses beams; onboarding also uses beams
  useEffect(() => {
    if (step === 'intro') return;
    const el = typeof step === 'number' ? obBeamsRef.current : beamsRef.current;
    if (!el) return;
    return startBeams(el);
  }, [step]);

  // ── GET STARTED (intro) screen ────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="screen intro-screen">
        {/* V3 sparkles canvas with radial mask */}
        <canvas ref={sparkRef} className="spark-cv" />

        {/* Content */}
        <div className="intr-body">
          {/* Logo mark */}
          <div className="intr-logo-wrap">
            <div className="intr-logo-box">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
                <path d="M18 4L22 14H32L24 20L27 30L18 24L9 30L12 20L4 14H14L18 4Z" fill="url(#sg)"/>
                <defs><linearGradient id="sg" x1="4" y1="4" x2="32" y2="32"><stop stopColor="#fff"/><stop offset="1" stopColor="rgba(255,255,255,.7)"/></linearGradient></defs>
              </svg>
            </div>
          </div>

          <h1 className="intr-title">Plan<span>IQ</span></h1>
          <p className="intr-tag">Your AI Schedule Advisor</p>

          {/* Glowing horizon line — V3 signature element */}
          <div className="intr-line">
            <div className="intr-ln-a" />
            <div className="intr-ln-b" />
          </div>
        </div>

        {/* CTA anchored at bottom */}
        <div className="intr-cta">
          <button className="spl-btn" onClick={() => setStep(0)}>
            Get Started →
          </button>
          <div className="intr-foot">
            <span onClick={() => router.push('/signup')} style={{cursor:'pointer'}}>Create account</span>
            {' · '}
            <span onClick={() => router.push('/login')} style={{cursor:'pointer'}}>Sign in</span>
          </div>
        </div>

        <style jsx>{`
          .screen { position:fixed; inset:0; overflow:hidden; background:#000; }

          /* V3 sparkles canvas — radial mask dissolves edges */
          .spark-cv {
            position:absolute; inset:0; width:100%; height:100%; z-index:0;
            -webkit-mask-image: radial-gradient(ellipse 95% 65% at 50% 53%, black 25%, transparent 85%);
            mask-image:         radial-gradient(ellipse 95% 65% at 50% 53%, black 25%, transparent 85%);
          }

          .intr-body {
            position:absolute; inset:0; z-index:3;
            display:flex; flex-direction:column;
            align-items:center; justify-content:center;
            padding-bottom:80px;
          }
          .intr-logo-wrap { margin-bottom:20px; }
          .intr-logo-box {
            width:64px; height:64px;
            background: linear-gradient(135deg,#6C5CE7,#A78BFA);
            border-radius:20px;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 0 40px rgba(108,92,231,.6), 0 0 80px rgba(108,92,231,.25);
          }
          .intr-title {
            font-size:52px; font-weight:900; color:#fff;
            letter-spacing:-2px; line-height:1;
            text-shadow: 0 0 40px rgba(196,181,253,.4);
          }
          .intr-title span { color:#C4B5FD; }
          .intr-tag {
            font-size:15px; color:rgba(255,255,255,.45);
            font-weight:500; margin-top:8px; margin-bottom:36px;
          }

          /* V3 signature glowing horizon line */
          .intr-line {
            position:relative; width:200px; height:8px;
          }
          .intr-ln-a {
            position:absolute; top:50%; left:0; right:0; height:1px;
            background: linear-gradient(90deg, transparent, rgba(108,92,231,.6) 30%, rgba(167,139,250,.9) 50%, rgba(108,92,231,.6) 70%, transparent);
          }
          .intr-ln-b {
            position:absolute; top:50%; left:50%; width:100px; height:4px;
            transform:translate(-50%,-50%);
            background: linear-gradient(90deg, transparent, rgba(196,181,253,.8), transparent);
            filter: blur(4px);
          }

          .intr-cta {
            position:absolute; bottom:0; left:0; right:0; z-index:5;
            padding:0 24px 44px;
            display:flex; flex-direction:column; align-items:center; gap:16px;
          }
          .spl-btn {
            width:100%; padding:16px;
            background:rgba(108,92,231,.75);
            border:1px solid rgba(167,139,250,.4);
            backdrop-filter:blur(16px);
            box-shadow:0 8px 32px rgba(108,92,231,.5), inset 0 1px 0 rgba(255,255,255,.14);
            border-radius:16px; color:#fff; font-size:16px; font-weight:700;
            font-family:inherit; cursor:pointer; transition:transform .15s;
          }
          .spl-btn:active { transform:scale(.97); }
          .intr-foot {
            font-size:13px; color:rgba(255,255,255,.35);
            font-weight:500;
          }
          .intr-foot span { color:#C4B5FD; font-weight:600; }
        `}</style>
      </div>
    );
  }

  // ── ONBOARDING slides ─────────────────────────────────────────
  const slide = SLIDES[step as number];
  return (
    <div className="screen ob-screen">
      {/* V3 BeamsBackground */}
      <div ref={obBeamsRef} className="ob-beams" />

      {/* V3 readability overlay */}
      <div className="ob-ov" aria-hidden />
      <div className="spl-vign" aria-hidden />

      {/* Slide content */}
      <div className="ob-body">
        <h1 className="ob-title">{slide.title}</h1>
        <p className="ob-desc">{slide.desc}</p>
        <div className="ob-dots">
          {SLIDES.map((_,i) => (
            <span key={i} className={`ob-dot${i === step ? ' on' : ''}`} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="ob-cta">
        {(step as number) < SLIDES.length - 1 ? (
          <button className="spl-btn" onClick={() => setStep((step as number)+1)}>Next →</button>
        ) : (
          <button className="spl-btn" onClick={() => router.push('/signup')}>Get Started →</button>
        )}
        <div className="ob-foot">
          <button className="ob-skip" onClick={() => router.push('/signup')}>Skip intro</button>
          <span style={{color:'rgba(255,255,255,.2)'}}>·</span>
          <button className="ob-skip" onClick={() => router.push('/login')}>Already have an account?</button>
        </div>
      </div>

      <style jsx>{`
        .screen { position:fixed; inset:0; overflow:hidden; }

        /* V3 BeamsBackground */
        .ob-screen { background:#09070F; }
        .ob-beams {
          position:absolute; inset:0; z-index:0;
          background:#09070F; overflow:hidden;
        }
        .ob-beams :global(canvas) {
          display:block; filter:blur(15px);
          position:absolute; inset:0;
          width:100%!important; height:100%!important;
        }

        /* V3 readability overlay */
        .ob-ov {
          position:absolute; inset:0; z-index:1; pointer-events:none;
          background: linear-gradient(to bottom,
            rgba(9,7,15,.30)  0%,
            rgba(9,7,15,.04) 14%,
            rgba(9,7,15,.04) 76%,
            rgba(9,7,15,.55) 100%);
        }
        .spl-vign {
          position:absolute; inset:0; z-index:2; pointer-events:none;
          box-shadow:inset 0 0 80px rgba(0,0,0,.55);
        }

        /* Slide content */
        .ob-body {
          position:absolute; inset:0; z-index:5;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          text-align:center; padding:0 36px 140px;
        }
        .ob-title {
          font-size:34px; font-weight:900; color:#fff;
          letter-spacing:-.8px; line-height:1.2;
          white-space:pre-line; margin-bottom:16px;
          text-shadow:0 2px 24px rgba(108,92,231,.3);
        }
        .ob-desc {
          font-size:15px; color:rgba(255,255,255,.58);
          line-height:1.7; font-weight:500; margin-bottom:32px;
        }
        .ob-dots { display:flex; gap:8px; }
        .ob-dot {
          width:8px; height:8px; border-radius:100px;
          background:rgba(255,255,255,.2); transition:all .28s;
        }
        .ob-dot.on { width:24px; background:#7C6AF0; }

        /* CTA */
        .ob-cta {
          position:absolute; bottom:0; left:0; right:0; z-index:6;
          padding:0 24px 44px;
          display:flex; flex-direction:column; align-items:center; gap:14px;
        }
        .spl-btn {
          width:100%; padding:16px;
          background:rgba(108,92,231,.75);
          border:1px solid rgba(167,139,250,.4);
          backdrop-filter:blur(16px);
          box-shadow:0 8px 32px rgba(108,92,231,.5), inset 0 1px 0 rgba(255,255,255,.14);
          border-radius:16px; color:#fff; font-size:16px; font-weight:700;
          font-family:inherit; cursor:pointer; transition:transform .15s;
        }
        .spl-btn:active { transform:scale(.97); }
        .ob-foot { display:flex; align-items:center; gap:10px; }
        .ob-skip {
          background:none; border:none; font-family:inherit;
          font-size:13px; color:rgba(255,255,255,.38); cursor:pointer;
          font-weight:600;
        }
        .ob-skip:active { color:rgba(255,255,255,.6); }
      `}</style>
    </div>
  );
}

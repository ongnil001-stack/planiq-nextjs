'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [onboardStep, setOnboardStep] = useState<number | null>(null);
  const router = useRouter();

  // Sparkle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Particle = { x: number; y: number; r: number; dx: number; dy: number; alpha: number; da: number; color: string };
    const colors = ['rgba(124,106,240,', 'rgba(167,139,250,', 'rgba(90,171,240,', 'rgba(255,255,255,'];
    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.7 + 0.1,
      da: (Math.random() - 0.5) * 0.005,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy; p.alpha += p.da;
        if (p.alpha <= 0.05 || p.alpha >= 0.9) p.da *= -1;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();

        if (p.r > 1.5) {
          ctx.beginPath();
          ctx.moveTo(p.x - p.r * 2, p.y);
          ctx.lineTo(p.x + p.r * 2, p.y);
          ctx.moveTo(p.x, p.y - p.r * 2);
          ctx.lineTo(p.x, p.y + p.r * 2);
          ctx.strokeStyle = p.color + (p.alpha * 0.6) + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  const ONBOARD_SLIDES = [
    {
      title: 'Plan Smarter,\nNot Harder',
      desc: 'PlanIQ organizes your day with intelligent scheduling that adapts to your energy, priorities, and goals.',
    },
    {
      title: 'AI That\nWorks For You',
      desc: 'Claude AI analyzes your workload in real-time — spotting overloads, conflicts, and opportunities before they happen.',
    },
    {
      title: 'Stay Balanced,\nStay On Track',
      desc: 'Visual workload scores, streak tracking, and weekly insights keep you productive without burning out.',
    },
  ];

  if (onboardStep !== null) {
    const slide = ONBOARD_SLIDES[onboardStep];
    return (
      <div className="ob-wrap">
        <canvas ref={canvasRef} className="canvas-bg" />
        <div className="ob-ov" />

        <div className="ob-body">
          <h1 className="ob-title">{slide.title}</h1>
          <p className="ob-desc">{slide.desc}</p>
          <div className="ob-dots">
            {ONBOARD_SLIDES.map((_, i) => (
              <span key={i} className={`ob-dot${i === onboardStep ? ' on' : ''}`} />
            ))}
          </div>
        </div>

        <div className="ob-cta">
          {onboardStep < ONBOARD_SLIDES.length - 1 ? (
            <button className="gs-btn" onClick={() => setOnboardStep(onboardStep + 1)}>
              Next →
            </button>
          ) : (
            <button className="gs-btn" onClick={() => router.push('/signup')}>
              Get Started →
            </button>
          )}
          <div className="ob-skip-row">
            Already have an account?{' '}
            <span onClick={() => router.push('/login')} style={{ color: '#C4B5FD', fontWeight: 700, cursor: 'pointer' }}>
              Sign in
            </span>
          </div>
        </div>

        <style jsx>{`
          .ob-wrap {
            position: fixed; inset: 0;
            background: #09070F; overflow: hidden;
          }
          .canvas-bg {
            position: absolute; inset: 0;
            pointer-events: none; z-index: 0;
          }
          .ob-ov {
            position: absolute; inset: 0; z-index: 1; pointer-events: none;
            background: linear-gradient(to bottom,
              rgba(9,7,15,.30) 0%,
              rgba(9,7,15,.04) 14%,
              rgba(9,7,15,.04) 76%,
              rgba(9,7,15,.55) 100%);
          }
          .ob-body {
            position: absolute; top: 0; left: 0; right: 0; bottom: 200px;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 3; padding: 0 28px; text-align: center;
          }
          .ob-title {
            font-size: 34px; font-weight: 800; color: #fff;
            letter-spacing: -0.8px; line-height: 1.18;
            margin-bottom: 18px; white-space: pre-line;
          }
          .ob-desc {
            font-size: 15px; color: rgba(255,255,255,.55);
            line-height: 1.7; margin-bottom: 36px;
            max-width: 300px;
          }
          .ob-dots { display: flex; gap: 8px; }
          .ob-dot {
            width: 8px; height: 8px; border-radius: 100px;
            background: rgba(255,255,255,.18); transition: all .3s;
          }
          .ob-dot.on { width: 24px; background: #7C6AF0; }
          .ob-cta {
            position: absolute; bottom: 0; left: 0; right: 0;
            padding: 12px 22px 34px; z-index: 6;
            display: flex; flex-direction: column; gap: 11px;
            background: linear-gradient(to top, rgba(0,0,0,.7) 40%, transparent);
          }
          .gs-btn {
            width: 100%; padding: 16px;
            background: rgba(108,92,231,.78);
            border: 1px solid rgba(167,139,250,.45);
            backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px rgba(108,92,231,.5), inset 0 1px 0 rgba(255,255,255,.13);
            border-radius: 14px; color: #fff;
            font-size: 16px; font-weight: 700; font-family: inherit;
            cursor: pointer; transition: transform .15s;
          }
          .gs-btn:active { transform: scale(.97); }
          .ob-skip-row {
            text-align: center; font-size: 13px;
            color: rgba(255,255,255,.38); font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  // Splash screen — matches prototype intro exactly
  return (
    <div className="splash">
      <canvas ref={canvasRef} className="spark-cv" />

      <div className="intr-body">
        <div className="intr-logo">Plan<span>IQ</span></div>
        <div className="intr-sub">Your AI Schedule Advisor</div>
        <div className="intr-glow">
          <div className="ig-a" />
          <div className="ig-b" />
          <div className="ig-c" />
          <div className="ig-d" />
        </div>
      </div>

      <div className="intr-cta">
        <button className="gs-btn" onClick={() => setOnboardStep(0)}>
          Get Started →
        </button>
        <div className="intr-si-link">
          Already have an account?{' '}
          <span onClick={() => router.push('/login')}>Sign in</span>
        </div>
      </div>

      <style jsx>{`
        .splash {
          position: fixed; inset: 0;
          background: #000; overflow: hidden;
        }
        .spark-cv {
          position: absolute; inset: 0;
          width: 100%; height: 100%; z-index: 0;
          -webkit-mask-image: radial-gradient(ellipse 95% 65% at 50% 53%, black 25%, transparent 85%);
          mask-image: radial-gradient(ellipse 95% 65% at 50% 53%, black 25%, transparent 85%);
        }
        .intr-body {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 3; padding-bottom: 30px;
        }
        .intr-logo {
          font-size: 68px; font-weight: 900;
          letter-spacing: -3px; line-height: 1;
          color: #fff;
          animation: iFU 1.1s cubic-bezier(.22,1,.36,1) both;
        }
        .intr-logo span { color: #A78BFA; }
        .intr-sub {
          font-size: 14px; font-weight: 500;
          color: rgba(255,255,255,.45);
          margin-top: 10px; letter-spacing: .6px;
          animation: iFU 1.1s .2s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes iFU {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Glowing horizon line */
        .intr-glow {
          position: relative; width: 340px; height: 18px; margin-top: 5px;
          animation: iFU 1.1s .35s cubic-bezier(.22,1,.36,1) both;
        }
        .ig-a {
          position: absolute; top: 50%; left: 0; right: 0; height: 2px;
          transform: translateY(-50%);
          background: linear-gradient(to right, transparent, rgba(99,102,241,.55) 20%, rgba(99,102,241,.55) 80%, transparent);
          filter: blur(1.5px);
        }
        .ig-b {
          position: absolute; top: 50%; left: 0; right: 0; height: 1px;
          transform: translateY(-50%);
          background: linear-gradient(to right, transparent, #6366f1 22%, #6366f1 78%, transparent);
          opacity: .65;
        }
        .ig-c {
          position: absolute; top: 50%; left: 50%; width: 140px; height: 7px;
          transform: translate(-50%, -50%);
          background: linear-gradient(to right, transparent, #38bdf8, transparent);
          filter: blur(3px); opacity: .85;
        }
        .ig-d {
          position: absolute; top: 50%; left: 50%; width: 70px; height: 1px;
          transform: translate(-50%, -50%);
          background: linear-gradient(to right, transparent, #bae6fd, transparent);
        }
        /* CTA buttons at bottom */
        .intr-cta {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 12px 22px 34px; z-index: 6;
          display: flex; flex-direction: column; gap: 11px;
          background: linear-gradient(to top, rgba(0,0,0,.7) 40%, transparent);
        }
        .gs-btn {
          width: 100%; padding: 16px;
          background: rgba(108,92,231,.78);
          border: 1px solid rgba(167,139,250,.45);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(108,92,231,.5), inset 0 1px 0 rgba(255,255,255,.13);
          border-radius: 14px; color: #fff;
          font-size: 16px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: transform .15s;
        }
        .gs-btn:active { transform: scale(.97); }
        .intr-si-link {
          text-align: center; font-size: 13px;
          color: rgba(255,255,255,.38); font-weight: 500;
        }
        .intr-si-link span {
          color: #C4B5FD; font-weight: 700;
          cursor: pointer; transition: opacity .15s;
        }
        .intr-si-link span:active { opacity: .6; }
      `}</style>
    </div>
  );
}

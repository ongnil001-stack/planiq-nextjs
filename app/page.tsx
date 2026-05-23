'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const router = useRouter();

  // Particle canvas
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

    const PARTICLE_COUNT = 80;
    type Particle = { x: number; y: number; r: number; dx: number; dy: number; alpha: number; da: number; color: string };
    const colors = ['rgba(124,106,240,', 'rgba(167,139,250,', 'rgba(90,171,240,', 'rgba(255,255,255,'];
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
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
        p.x += p.dx;
        p.y += p.dy;
        p.alpha += p.da;
        if (p.alpha <= 0.05 || p.alpha >= 0.9) p.da *= -1;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();

        // Draw a small sparkle cross on some
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
  }, [showOnboarding]);

  const ONBOARD_SLIDES = [
    {
      icon: '📅',
      title: 'Plan Smarter,\nNot Harder',
      desc: 'PlanIQ organizes your day with intelligent scheduling that adapts to your energy, priorities, and goals.',
    },
    {
      icon: '✦',
      title: 'AI That\nWorks For You',
      desc: 'Claude AI analyzes your workload in real-time — spotting overloads, conflicts, and opportunities before they happen.',
    },
    {
      icon: '📊',
      title: 'Stay Balanced,\nStay On Track',
      desc: 'Visual workload scores, streak tracking, and weekly insights keep you productive without burning out.',
    },
  ];

  if (showOnboarding) {
    const slide = ONBOARD_SLIDES[onboardStep];
    return (
      <div className="onboard-wrap">
        <canvas ref={canvasRef} className="canvas-bg" />
        <div className="onboard-card">
          <div className="onboard-icon-wrap">
            <span className="onboard-icon">{slide.icon}</span>
          </div>
          <h1 className="onboard-title">{slide.title}</h1>
          <p className="onboard-desc">{slide.desc}</p>

          {/* Dots */}
          <div className="dots">
            {ONBOARD_SLIDES.map((_, i) => (
              <span key={i} className={`dot ${i === onboardStep ? 'active' : ''}`} />
            ))}
          </div>

          {onboardStep < ONBOARD_SLIDES.length - 1 ? (
            <button className="btn-main" onClick={() => setOnboardStep(onboardStep + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn-main" onClick={() => router.push('/signup')}>
              Get Started →
            </button>
          )}

          <div className="onboard-footer">
            <button className="skip-btn" onClick={() => router.push('/signup')}>Skip intro</button>
            <span className="sep">·</span>
            <button className="skip-btn" onClick={() => router.push('/login')}>Already have an account? Sign in</button>
          </div>
        </div>

        <style jsx>{`
          .onboard-wrap {
            min-height: 100vh;
            background: radial-gradient(ellipse at 30% 20%, #1A1060 0%, #0B0D1A 60%);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 0 0 40px;
          }
          .canvas-bg {
            position: fixed; inset: 0;
            pointer-events: none;
            z-index: 0;
          }
          .onboard-card {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 420px;
            padding: 36px 28px 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .onboard-icon-wrap {
            width: 80px; height: 80px;
            background: rgba(124,106,240,0.18);
            border: 1.5px solid rgba(124,106,240,0.35);
            border-radius: 24px;
            display: flex; align-items: center; justify-content: center;
            font-size: 36px;
            margin-bottom: 28px;
            backdrop-filter: blur(12px);
          }
          .onboard-title {
            font-size: 32px; font-weight: 800; color: #fff;
            letter-spacing: -0.8px; line-height: 1.15;
            margin-bottom: 16px; white-space: pre-line;
          }
          .onboard-desc {
            font-size: 15px; color: rgba(255,255,255,0.55);
            line-height: 1.7; margin-bottom: 36px;
          }
          .dots { display: flex; gap: 8px; margin-bottom: 28px; }
          .dot { width: 8px; height: 8px; border-radius: 100px; background: rgba(255,255,255,0.2); transition: all .3s; }
          .dot.active { width: 24px; background: #7C6AF0; }
          .btn-main {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #6C5CE7, #A78BFA);
            border: none; border-radius: 16px;
            font-size: 16px; font-weight: 700; color: #fff;
            font-family: inherit; cursor: pointer;
            box-shadow: 0 8px 28px rgba(108,92,231,0.45);
            transition: transform .15s;
            margin-bottom: 20px;
          }
          .btn-main:active { transform: scale(0.97); }
          .onboard-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
          .skip-btn { background: none; border: none; font-family: inherit; font-size: 13px; color: rgba(255,255,255,0.45); cursor: pointer; }
          .skip-btn:hover { color: rgba(255,255,255,0.7); }
          .sep { color: rgba(255,255,255,0.25); font-size: 12px; }
        `}</style>
      </div>
    );
  }

  // Splash screen
  return (
    <div className="splash-wrap">
      <canvas ref={canvasRef} className="canvas-bg" />

      <div className="splash-content">
        {/* Logo */}
        <div className="logo-wrap">
          <div className="logo-ring outer" />
          <div className="logo-ring inner" />
          <div className="logo-icon-box">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 4L22 14H32L24 20L27 30L18 24L9 30L12 20L4 14H14L18 4Z" fill="url(#star-grad)" />
              <defs>
                <linearGradient id="star-grad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff" />
                  <stop offset="1" stopColor="rgba(255,255,255,0.7)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="splash-title">PlanIQ</h1>
        <p className="splash-sub">Your AI Schedule Advisor</p>

        <button className="btn-get-started" onClick={() => setShowOnboarding(true)}>
          Get Started →
        </button>

        <p className="splash-note">No credit card. Early access is free.</p>
      </div>

      {/* Bottom glow */}
      <div className="bottom-glow" />

      <style jsx>{`
        .splash-wrap {
          min-height: 100vh;
          background: radial-gradient(ellipse at 40% 30%, #1A1060 0%, #0B0D1A 65%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          overflow: hidden; position: relative;
        }
        .canvas-bg {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
        }
        .splash-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          padding: 24px;
        }
        .logo-wrap {
          position: relative;
          width: 100px; height: 100px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }
        .logo-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(124,106,240,0.25);
          animation: rotate-ring 8s linear infinite;
        }
        .logo-ring.outer { width: 100px; height: 100px; }
        .logo-ring.inner { width: 74px; height: 74px; animation-duration: 5s; animation-direction: reverse; }
        @keyframes rotate-ring {
          to { transform: rotate(360deg); }
        }
        .logo-icon-box {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #6C5CE7, #A78BFA);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 40px rgba(108,92,231,0.6), 0 0 80px rgba(108,92,231,0.2);
        }
        .splash-title {
          font-size: 44px; font-weight: 800;
          color: #fff; letter-spacing: -1.5px;
          margin-bottom: 8px;
        }
        .splash-sub {
          font-size: 16px; color: rgba(255,255,255,0.5);
          font-weight: 500; margin-bottom: 52px;
          letter-spacing: 0.2px;
        }
        .btn-get-started {
          padding: 16px 48px;
          background: linear-gradient(135deg, #6C5CE7, #A78BFA);
          border: none; border-radius: 16px;
          font-size: 17px; font-weight: 700; color: #fff;
          font-family: inherit; cursor: pointer;
          box-shadow: 0 8px 32px rgba(108,92,231,0.5);
          transition: transform .15s, box-shadow .15s;
          margin-bottom: 16px;
        }
        .btn-get-started:active { transform: scale(0.97); box-shadow: 0 4px 16px rgba(108,92,231,0.4); }
        .splash-note {
          font-size: 12px; color: rgba(255,255,255,0.25); font-weight: 500;
        }
        .bottom-glow {
          position: absolute; bottom: -100px; left: 50%;
          transform: translateX(-50%);
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(108,92,231,0.25) 0%, transparent 70%);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

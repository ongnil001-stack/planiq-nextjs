'use client';

/**
 * SparkAssistant — PlanIQ's minimal, professional mascot
 * ──────────────────────────────────────────────────────────────────────────
 * A clean geometric SVG character. Not a cartoon. Think: AI companion from
 * a premium productivity tool — like Notion's subtle assistant feel, not
 * Duolingo's pushy owl.
 *
 * Visual: a crystalline orb with orbital rings and ambient sparkle particles.
 * All animation is pure CSS. No external libraries. Respects prefers-reduced-motion.
 *
 * Modes:
 *   idle       — gentle float + soft glow pulse (always on)
 *   celebrate  — brief sparkle burst (award unlocked)
 *   streak     — energy pulse + lightning accent (streak active)
 *   sleeping   — very subtle, almost static (no activity)
 */

import { useEffect, useState } from 'react';

type Mode = 'idle' | 'celebrate' | 'streak' | 'sleeping';

interface Props {
  mode?:    Mode;
  size?:    number;
  visible?: boolean; // false = render nothing (animations disabled in settings)
}

export default function SparkAssistant({ mode = 'idle', size = 64, visible = true }: Props) {
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [burst,          setBurst]          = useState(false);

  // Detect reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Trigger burst animation when mode becomes 'celebrate'
  useEffect(() => {
    if (mode === 'celebrate' && !prefersReduced) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 900);
      return () => clearTimeout(t);
    }
  }, [mode, prefersReduced]);

  if (!visible) return null;

  const noAnim = prefersReduced;
  const cx = size / 2;
  const r  = size * 0.17;   // core orb radius

  // Animation names
  const floatAnim    = noAnim ? 'none' : 'spkFloat 3.2s ease-in-out infinite';
  const glowAnim     = noAnim ? 'none' : 'spkGlow 2.4s ease-in-out infinite';
  const orbitAnim    = noAnim ? 'none' : 'spkOrbit 10s linear infinite';
  const orbitRevAnim = noAnim ? 'none' : 'spkOrbitRev 16s linear infinite';
  const streakAnim   = noAnim ? 'none' : 'spkStreak 1.6s ease-in-out infinite';
  const burstAnim    = noAnim ? 'none' : 'spkBurst .85s cubic-bezier(.2,.8,.4,1) forwards';

  const isStreak    = mode === 'streak';
  const isSleeping  = mode === 'sleeping';

  return (
    <>
      <style>{`
        @keyframes spkFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes spkGlow {
          0%,100% { opacity: .75; }
          50%      { opacity: 1;   }
        }
        @keyframes spkOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spkOrbitRev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes spkStreak {
          0%,100% { opacity: .8;  filter: none; }
          50%      { opacity: 1;   filter: drop-shadow(0 0 5px var(--amber,#FFB830)); }
        }
        @keyframes spkBurst {
          0%   { transform: scale(1);    opacity: 1; }
          40%  { transform: scale(1.35); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes spkSpk1 {
          0%,100% { transform: translate(0,0) scale(1); opacity: .9; }
          50%      { transform: translate(-3px,-5px) scale(1.3); opacity: 1; }
        }
        @keyframes spkSpk2 {
          0%,100% { transform: translate(0,0) scale(1); opacity: .7; }
          50%      { transform: translate(4px,-4px) scale(1.2); opacity: .9; }
        }
        @keyframes spkSpk3 {
          0%,100% { transform: translate(0,0) scale(1); opacity: .8; }
          50%      { transform: translate(2px,4px) scale(1.1); opacity: .6; }
        }
        @keyframes spkSpk4 {
          0%,100% { transform: translate(0,0) scale(.9); opacity: .6; }
          50%      { transform: translate(-4px,2px) scale(1.2); opacity: 1; }
        }
      `}</style>

      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size,
        animation: burst ? burstAnim : floatAnim,
        opacity: isSleeping ? .45 : 1,
        transition: 'opacity .4s ease',
      }}>
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Core gradient — matches theme */}
            <radialGradient id="spkCore" cx="40%" cy="35%" r="60%">
              <stop offset="0%"   stopColor="var(--g-start,#00C6FF)" stopOpacity=".9"/>
              <stop offset="100%" stopColor="var(--g-end,#0066FF)"   stopOpacity="1"/>
            </radialGradient>
            {/* Glow filter */}
            <filter id="spkGlowF" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.07} result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            {/* Streak glow */}
            <filter id="spkStrkF" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.1}/>
            </filter>
          </defs>

          {/* ── Outer ambient glow (behind everything) */}
          <circle
            cx={cx} cy={cx} r={r * 2.4}
            fill="url(#spkCore)" opacity=".08"
            style={{ animation: glowAnim }}
          />

          {/* ── Slow outer orbit ring */}
          <g style={{
            transformOrigin: `${cx}px ${cx}px`,
            animation: orbitRevAnim,
          }}>
            <circle
              cx={cx} cy={cx} r={r * 2.1}
              stroke="var(--purple,#7C6AF0)" strokeWidth={size * 0.012}
              strokeDasharray={`${size * 0.12} ${size * 0.2}`}
              opacity={isSleeping ? .1 : .22}
            />
          </g>

          {/* ── Fast inner orbit ring */}
          <g style={{
            transformOrigin: `${cx}px ${cx}px`,
            animation: orbitAnim,
          }}>
            <circle
              cx={cx} cy={cx} r={r * 1.6}
              stroke="var(--purple,#7C6AF0)" strokeWidth={size * 0.008}
              strokeDasharray={`${size * 0.08} ${size * 0.14}`}
              opacity={isSleeping ? .08 : .18}
            />
            {/* Small orbiting dot */}
            <circle
              cx={cx + r * 1.6} cy={cx}
              r={size * 0.028}
              fill="var(--g-start,#00C6FF)"
              opacity={isSleeping ? .2 : .7}
            />
          </g>

          {/* ── Core orb */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="url(#spkCore)"
            filter="url(#spkGlowF)"
            style={{ animation: isStreak ? streakAnim : glowAnim }}
          />

          {/* ── Streak accent: subtle lightning shape */}
          {isStreak && !noAnim && (
            <>
              <circle
                cx={cx} cy={cx} r={r * 1.5}
                fill="var(--amber,#FFB830)" opacity=".04"
                style={{ animation: streakAnim }}
              />
              <path
                d={`M${cx-r*.3} ${cx-r*.8} L${cx-r*.05} ${cx-.2} L${cx+r*.3} ${cx-.2} L${cx+r*.05} ${cx+r*.8}`}
                stroke="var(--amber,#FFB830)" strokeWidth={size * 0.028}
                strokeLinecap="round" strokeLinejoin="round"
                opacity=".55"
                style={{ animation: streakAnim }}
              />
            </>
          )}

          {/* ── Sparkle particles (4 ambient dots) */}
          {!isSleeping && (
            <>
              <circle cx={cx - r*2.1} cy={cx - r*1.6} r={size * 0.022}
                fill="var(--amber,#FFB830)" opacity={isStreak ? .85 : .55}
                style={{ animation: noAnim ? 'none' : 'spkSpk1 2.8s ease-in-out .0s infinite' }}/>
              <circle cx={cx + r*2.3} cy={cx - r*1.2} r={size * 0.018}
                fill="var(--mint,#00E5C0)" opacity=".6"
                style={{ animation: noAnim ? 'none' : 'spkSpk2 3.2s ease-in-out .6s infinite' }}/>
              <circle cx={cx + r*1.8} cy={cx + r*2.0} r={size * 0.016}
                fill="var(--g-start,#00C6FF)" opacity=".5"
                style={{ animation: noAnim ? 'none' : 'spkSpk3 2.6s ease-in-out 1.1s infinite' }}/>
              <circle cx={cx - r*1.9} cy={cx + r*1.8} r={size * 0.014}
                fill="var(--purple,#7C6AF0)" opacity={burst ? .9 : .45}
                style={{ animation: noAnim ? 'none' : 'spkSpk4 3.5s ease-in-out 1.8s infinite' }}/>
            </>
          )}

          {/* ── Centre highlight — small inner bright spot */}
          <circle
            cx={cx - r * .28} cy={cx - r * .28}
            r={r * .32}
            fill="rgba(255,255,255,.45)"
          />
        </svg>
      </div>
    </>
  );
}

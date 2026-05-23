'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Schedule, AiAnalysis } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import BottomNav from '@/components/layout/BottomNav';

interface Props {
  profile: Profile | null;
  todaySchedules: Schedule[];
  upcomingSchedules: Schedule[];
  latestAnalysis: AiAnalysis | null;
}

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardClient({ profile, todaySchedules, upcomingSchedules, latestAnalysis }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const completedToday = todaySchedules.filter((s) => s.is_completed).length;
  const totalToday = todaySchedules.length;
  const progressPct = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

  async function toggleComplete(schedule: Schedule) {
    setCompletingId(schedule.id);
    const { error } = await supabase
      .from('schedules')
      .update({ is_completed: !schedule.is_completed } as { is_completed: boolean })
      .eq('id', schedule.id);
    if (error) toast.error('Could not update task');
    else router.refresh();
    setCompletingId(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const workloadScore = latestAnalysis?.workload_score ?? null;
  const workloadLabel =
    workloadScore === null ? 'No analysis yet'
    : workloadScore >= 80 ? '🔴 Heavy'
    : workloadScore >= 60 ? '🟡 Moderate'
    : workloadScore >= 30 ? '🟢 Balanced'
    : '⚪ Light';

  return (
    <div className="page">
      {/* Status bar */}
      <div className="status-bar">
        <span className="time">
          {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
        <span className="icons">●●●</span>
      </div>

      {/* Header */}
      <div className="header">
        <div>
          <p className="greeting">{GREETING()}, {firstName} 👋</p>
          <p className="date-label">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="avatar-btn" onClick={handleSignOut} title="Sign out">
          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
        </button>
      </div>

      <div className="scroll">
        {/* Today progress card */}
        <div className="section-card progress-card">
          <div className="progress-top">
            <div>
              <p className="card-title">Today&apos;s Progress</p>
              <p className="card-sub">{completedToday}/{totalToday} tasks done</p>
            </div>
            <div className="progress-ring">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--pur-lt)" strokeWidth="4"/>
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke="var(--purple)" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressPct / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                />
              </svg>
              <span className="ring-pct">{progressPct}%</span>
            </div>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* AI Insight pill */}
        <Link href="/ai-analysis" className="ai-pill">
          <span className="ai-pill-icon">✦</span>
          <div className="ai-pill-text">
            <p className="ai-pill-label">AI Workload</p>
            <p className="ai-pill-val">{workloadLabel}</p>
          </div>
          <span className="ai-pill-arrow">→</span>
        </Link>

        {/* Today's schedule */}
        <div className="section-header">
          <span className="section-title">Today&apos;s Schedule</span>
          <Link href="/calendar" className="see-all">See all</Link>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📭</p>
            <p className="empty-text">No items scheduled today</p>
            <Link href="/schedule/new" className="empty-cta">+ Add something</Link>
          </div>
        ) : (
          <div className="task-list">
            {todaySchedules.map((s) => (
              <div key={s.id} className={`task-item ${s.is_completed ? 'done' : ''}`}>
                <button
                  className="check-btn"
                  onClick={() => toggleComplete(s)}
                  disabled={completingId === s.id}
                  style={{ borderColor: PRIORITY_COLORS[s.priority] }}
                >
                  {s.is_completed && '✓'}
                </button>
                <div className="task-body">
                  <p className="task-title">{s.title}</p>
                  <p className="task-meta">
                    {TYPE_ICONS[s.type]} {formatTime(s.start_time)}
                    {s.end_time ? ` — ${formatTime(s.end_time)}` : ''}
                  </p>
                </div>
                <span className="priority-dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
              </div>
            ))}
          </div>
        )}

        {/* Upcoming */}
        {upcomingSchedules.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 8 }}>
              <span className="section-title">Coming Up</span>
            </div>
            <div className="task-list">
              {upcomingSchedules.map((s) => (
                <div key={s.id} className="task-item">
                  <span className="type-icon">{TYPE_ICONS[s.type]}</span>
                  <div className="task-body">
                    <p className="task-title">{s.title}</p>
                    <p className="task-meta">
                      {new Date(s.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}{formatTime(s.start_time)}
                    </p>
                  </div>
                  <span className="priority-dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 24 }} />
      </div>

      <BottomNav />

      <style jsx>{`
        .page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .status-bar { padding: 12px 22px 0; display: flex; justify-content: space-between; align-items: center; }
        .time { font-size: 15px; font-weight: 700; color: var(--dark); }
        .icons { font-size: 10px; color: var(--mid); letter-spacing: 2px; }
        .header { padding: 14px 22px 18px; display: flex; align-items: center; justify-content: space-between; }
        .greeting { font-size: 22px; font-weight: 800; color: var(--dark); }
        .date-label { font-size: 13px; color: var(--mid); margin-top: 2px; font-weight: 500; }
        .avatar-btn {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--gradient); color: #fff; font-size: 16px; font-weight: 700;
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .scroll { flex: 1; overflow-y: auto; padding: 0 16px; padding-bottom: 80px; }
        .section-card { background: var(--surf); border-radius: var(--rmd); padding: 18px; margin-bottom: 12px; box-shadow: var(--card-sh2); }
        .progress-card {}
        .progress-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .card-title { font-size: 15px; font-weight: 700; color: var(--dark); }
        .card-sub { font-size: 12px; color: var(--mid); margin-top: 3px; }
        .progress-ring { position: relative; width: 56px; height: 56px; }
        .ring-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--purple); }
        .progress-bar-bg { height: 6px; background: var(--pur-lt); border-radius: 100px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: var(--gradient); border-radius: 100px; transition: width .4s ease; }
        .ai-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: #FFFBF0;
          border: 1px solid #FFE0A0; border-radius: 14px;
          margin-bottom: 20px; text-decoration: none; cursor: pointer;
          transition: background .18s;
        }
        .ai-pill:active { background: #FFF3D0; }
        .ai-pill-icon { font-size: 18px; color: var(--purple); }
        .ai-pill-text { flex: 1; }
        .ai-pill-label { font-size: 11px; font-weight: 600; color: var(--mid); text-transform: uppercase; letter-spacing: .8px; }
        .ai-pill-val { font-size: 14px; font-weight: 700; color: var(--dark); margin-top: 1px; }
        .ai-pill-arrow { font-size: 16px; color: var(--mid); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .section-title { font-size: 16px; font-weight: 700; color: var(--dark); }
        .see-all { font-size: 13px; font-weight: 600; color: var(--purple); text-decoration: none; }
        .empty-state { background: var(--surf); border-radius: var(--rmd); padding: 28px; text-align: center; box-shadow: var(--card-sh2); margin-bottom: 12px; }
        .empty-icon { font-size: 32px; margin-bottom: 8px; }
        .empty-text { font-size: 14px; color: var(--mid); margin-bottom: 14px; }
        .empty-cta { display: inline-block; padding: 9px 20px; background: var(--gradient); border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
        .task-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
        .task-item { background: var(--surf); border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 12px; box-shadow: var(--card-sh2); transition: opacity .2s; }
        .task-item.done { opacity: .55; }
        .check-btn { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--lite); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--purple); font-weight: 700; flex-shrink: 0; transition: background .15s; }
        .check-btn:disabled { opacity: .5; }
        .type-icon { font-size: 20px; flex-shrink: 0; }
        .task-body { flex: 1; min-width: 0; }
        .task-title { font-size: 14px; font-weight: 600; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .task-meta { font-size: 12px; color: var(--mid); margin-top: 2px; }
        .priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      `}</style>
    </div>
  );
}

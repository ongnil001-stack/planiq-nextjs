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

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Mock weekly workload data — in production this would come from Supabase
const WEEK_WORKLOAD = [65, 80, 45, 90, 70, 30, 20];
const WEEK_MAX = 100;

// Priority dot colors for weekly grid
const DOT_COLORS = ['#7C6AF0','#FF6B8A','#00D67E','#FDCB6E','#74B9FF'];

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
      .update({ is_completed: !schedule.is_completed })
      .eq('id', schedule.id);
    if (error) toast.error('Could not update task');
    else router.refresh();
    setCompletingId(null);
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const workloadScore = latestAnalysis?.workload_score ?? 78;

  const workloadStatus =
    workloadScore >= 85 ? { label: 'Overloaded', color: '#FF6B8A', bg: 'rgba(255,107,138,0.12)' }
    : workloadScore >= 65 ? { label: 'Moderate', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)' }
    : workloadScore >= 30 ? { label: 'On Track', color: '#00D67E', bg: 'rgba(0,214,126,0.12)' }
    : { label: 'Light', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)' };

  // Streak: count consecutive days with completed schedules (simplified)
  const streakDays = 7;

  // Today's day index (0=Mon)
  const todayIdx = (new Date().getDay() + 6) % 7;

  // In-progress task
  const inProgress = todaySchedules.find((s) => !s.is_completed);

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <p className="greeting">{GREETING()}, {firstName}</p>
          <p className="role-tag">{profile?.role_title ?? 'Civil Engineer · Entrepreneur'}</p>
        </div>
        <Link href="/profile" className="avatar-btn">
          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
        </Link>
      </div>

      <div className="scroll">
        {/* Date + Score row */}
        <div className="date-score-row">
          <div className="date-card">
            <p className="date-day">{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</p>
            <p className="date-num">{new Date().getDate()}</p>
            <p className="date-month">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            <p className="date-tasks">{totalToday} activities</p>
          </div>
          <div className="score-card">
            <p className="score-label">Workload Score</p>
            <div className="score-ring-wrap">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={workloadStatus.color} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - workloadScore / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="score-inner">
                <span className="score-num">{workloadScore}</span>
              </div>
            </div>
            <div className="score-status-badge" style={{ background: workloadStatus.bg, color: workloadStatus.color }}>
              {workloadStatus.label}
            </div>
          </div>
        </div>

        {/* In-progress task */}
        {inProgress && (
          <div className="inprogress-card">
            <div className="inprogress-header">
              <span className="inprogress-tag">⚡ In Progress</span>
              <span className="inprogress-time">{formatTime(inProgress.start_time)}</span>
            </div>
            <p className="inprogress-title">{inProgress.title}</p>
            <div className="inprogress-bar-bg">
              <div className="inprogress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="inprogress-pct">{progressPct}% of today done</p>
          </div>
        )}

        {/* Streak counter */}
        <div className="streak-row">
          <div className="streak-card">
            <span className="streak-fire">🔥</span>
            <div>
              <p className="streak-num">{streakDays}-day streak</p>
              <p className="streak-sub">Keep it up!</p>
            </div>
          </div>
          <Link href="/ai-analysis" className="ai-quick-card">
            <span className="ai-star">✦</span>
            <div>
              <p className="ai-quick-label">AI Analysis</p>
              <p className="ai-quick-val">View insights →</p>
            </div>
          </Link>
        </div>

        {/* Weekly schedule grid */}
        <div className="section-header">
          <span className="section-title">This Week</span>
          <Link href="/calendar" className="see-all">See calendar →</Link>
        </div>
        <div className="week-grid">
          {DAYS.map((day, i) => {
            const isToday = i === todayIdx;
            const barH = Math.max(4, Math.round((WEEK_WORKLOAD[i] / WEEK_MAX) * 44));
            const barColor = WEEK_WORKLOAD[i] >= 85
              ? '#FF6B8A'
              : WEEK_WORKLOAD[i] >= 65
              ? '#FDCB6E'
              : '#7C6AF0';
            return (
              <div key={day} className={`week-col ${isToday ? 'today' : ''}`}>
                <span className="week-day">{day}</span>
                <div className="week-bar-track">
                  <div className="week-bar-fill" style={{ height: barH, background: isToday ? '#7C6AF0' : barColor }} />
                </div>
                <div className="week-dots">
                  {DOT_COLORS.slice(0, Math.ceil(WEEK_WORKLOAD[i] / 25)).map((c, di) => (
                    <span key={di} className="week-dot" style={{ background: c }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workload balance bars */}
        <div className="section-header" style={{ marginTop: 20 }}>
          <span className="section-title">Workload Balance</span>
          {workloadStatus.label === 'Overloaded' && (
            <span className="warn-badge">⚠ Overloaded day</span>
          )}
        </div>
        <div className="workload-card">
          {[
            { label: 'Deep Work', pct: 55, color: '#7C6AF0' },
            { label: 'Meetings', pct: 25, color: '#FF6B8A' },
            { label: 'Admin', pct: 15, color: '#FDCB6E' },
            { label: 'Personal', pct: 5, color: '#00D67E' },
          ].map((item) => (
            <div key={item.label} className="wl-row">
              <span className="wl-label">{item.label}</span>
              <div className="wl-bar-bg">
                <div className="wl-bar-fill" style={{ width: `${item.pct}%`, background: item.color }} />
              </div>
              <span className="wl-pct">{item.pct}%</span>
            </div>
          ))}
        </div>

        {/* Today's schedule */}
        <div className="section-header" style={{ marginTop: 20 }}>
          <span className="section-title">Today&apos;s Schedule</span>
          <Link href="/schedule/new" className="see-all">+ Add</Link>
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

        {/* Coming up */}
        {upcomingSchedules.filter(s => !todaySchedules.find(t => t.id === s.id)).length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 20 }}>
              <span className="section-title">Coming Up</span>
            </div>
            <div className="task-list">
              {upcomingSchedules.filter(s => !todaySchedules.find(t => t.id === s.id)).map((s) => (
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

        <div style={{ height: 32 }} />
      </div>

      <BottomNav />

      <style jsx>{`
        .page { min-height: 100vh; background: #0B0D1A; display: flex; flex-direction: column; color: #fff; font-family: 'Sora', sans-serif; }
        .header { padding: 56px 20px 16px; display: flex; align-items: flex-start; justify-content: space-between; }
        .greeting { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.4px; }
        .role-tag { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; font-weight: 500; }
        .avatar-btn {
          width: 42px; height: 42px; border-radius: 50%;
          background: linear-gradient(135deg, #6C5CE7, #A78BFA);
          color: #fff; font-size: 17px; font-weight: 700;
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; text-decoration: none; box-shadow: 0 4px 16px rgba(108,92,231,0.4);
        }
        .scroll { flex: 1; overflow-y: auto; padding: 0 16px; padding-bottom: 100px; }

        /* Date + Score */
        .date-score-row { display: flex; gap: 12px; margin-bottom: 14px; }
        .date-card {
          flex: 1; background: #161829; border-radius: 20px;
          padding: 16px; border: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; gap: 2px;
        }
        .date-day { font-size: 12px; font-weight: 600; color: #7C6AF0; text-transform: uppercase; letter-spacing: 1px; }
        .date-num { font-size: 36px; font-weight: 800; color: #fff; line-height: 1.1; }
        .date-month { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; }
        .date-tasks { margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 500; }
        .score-card {
          width: 130px; background: #161829; border-radius: 20px;
          padding: 14px 12px; border: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .score-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; text-align: center; }
        .score-ring-wrap { position: relative; width: 80px; height: 80px; }
        .score-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .score-num { font-size: 22px; font-weight: 800; color: #fff; }
        .score-status-badge { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }

        /* In progress */
        .inprogress-card {
          background: linear-gradient(135deg, rgba(108,92,231,0.22), rgba(167,139,250,0.12));
          border: 1px solid rgba(124,106,240,0.3);
          border-radius: 18px; padding: 16px; margin-bottom: 14px;
        }
        .inprogress-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .inprogress-tag { font-size: 11px; font-weight: 700; color: #7C6AF0; text-transform: uppercase; letter-spacing: 0.8px; }
        .inprogress-time { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500; }
        .inprogress-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; }
        .inprogress-bar-bg { height: 5px; background: rgba(255,255,255,0.1); border-radius: 100px; overflow: hidden; margin-bottom: 6px; }
        .inprogress-bar-fill { height: 100%; background: linear-gradient(90deg, #6C5CE7, #A78BFA); border-radius: 100px; transition: width 0.6s ease; }
        .inprogress-pct { font-size: 11px; color: rgba(255,255,255,0.4); }

        /* Streak row */
        .streak-row { display: flex; gap: 12px; margin-bottom: 20px; }
        .streak-card {
          flex: 1; display: flex; align-items: center; gap: 12px;
          background: rgba(253,203,110,0.10); border: 1px solid rgba(253,203,110,0.2);
          border-radius: 16px; padding: 14px;
        }
        .streak-fire { font-size: 24px; }
        .streak-num { font-size: 14px; font-weight: 700; color: #fff; }
        .streak-sub { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .ai-quick-card {
          flex: 1; display: flex; align-items: center; gap: 12px;
          background: rgba(124,106,240,0.12); border: 1px solid rgba(124,106,240,0.25);
          border-radius: 16px; padding: 14px; text-decoration: none;
        }
        .ai-star { font-size: 20px; color: #A78BFA; }
        .ai-quick-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 2px; }
        .ai-quick-val { font-size: 13px; font-weight: 700; color: #fff; }

        /* Section headers */
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .section-title { font-size: 16px; font-weight: 700; color: #fff; }
        .see-all { font-size: 13px; font-weight: 600; color: #7C6AF0; text-decoration: none; }
        .warn-badge { font-size: 11px; font-weight: 700; color: #FF6B8A; background: rgba(255,107,138,0.12); padding: 3px 10px; border-radius: 100px; }

        /* Weekly grid */
        .week-grid {
          display: flex; gap: 6px;
          background: #161829; border-radius: 18px;
          padding: 16px 12px;
          border: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 4px;
        }
        .week-col {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 6px 4px; border-radius: 12px; transition: background 0.2s;
        }
        .week-col.today { background: rgba(124,106,240,0.15); }
        .week-day { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 0.3px; }
        .week-col.today .week-day { color: #A78BFA; }
        .week-bar-track {
          width: 100%; height: 44px;
          background: rgba(255,255,255,0.05); border-radius: 6px;
          display: flex; align-items: flex-end; overflow: hidden;
        }
        .week-bar-fill { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.5s ease; }
        .week-dots { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; min-height: 14px; }
        .week-dot { width: 5px; height: 5px; border-radius: 50%; }

        /* Workload balance */
        .workload-card {
          background: #161829; border-radius: 18px;
          padding: 16px; border: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; gap: 12px;
        }
        .wl-row { display: flex; align-items: center; gap: 10px; }
        .wl-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); width: 72px; flex-shrink: 0; }
        .wl-bar-bg { flex: 1; height: 7px; background: rgba(255,255,255,0.07); border-radius: 100px; overflow: hidden; }
        .wl-bar-fill { height: 100%; border-radius: 100px; transition: width 0.6s ease; }
        .wl-pct { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); width: 30px; text-align: right; flex-shrink: 0; }

        /* Tasks */
        .task-list { display: flex; flex-direction: column; gap: 8px; }
        .task-item {
          background: #161829; border-radius: 14px; padding: 14px;
          display: flex; align-items: center; gap: 12px;
          border: 1px solid rgba(255,255,255,0.07); transition: opacity .2s;
        }
        .task-item.done { opacity: .45; }
        .check-btn {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2); background: transparent;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: #7C6AF0; font-weight: 700;
          flex-shrink: 0; transition: background .15s; font-family: inherit;
        }
        .check-btn:disabled { opacity: .5; }
        .type-icon { font-size: 20px; flex-shrink: 0; }
        .task-body { flex: 1; min-width: 0; }
        .task-title { font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .task-meta { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .empty-state { background: #161829; border-radius: 18px; padding: 32px; text-align: center; border: 1px solid rgba(255,255,255,0.07); }
        .empty-icon { font-size: 32px; margin-bottom: 8px; }
        .empty-text { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
        .empty-cta { display: inline-block; padding: 9px 20px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
      `}</style>
    </div>
  );
}

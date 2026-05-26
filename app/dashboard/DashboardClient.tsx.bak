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

const DAY_LABELS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const WEEK_WORKLOAD = [65, 80, 45, 100, 70, 57, 8];

export default function DashboardClient({ profile, todaySchedules, upcomingSchedules, latestAnalysis }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, setCompletingId] = useState<string | null>(null);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [perfExpanded, setPerfExpanded] = useState(false);

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
    workloadScore >= 85 ? { label: 'Overloaded', color: '#FF6B8A', badgeClass: 'attention' }
    : workloadScore >= 65 ? { label: 'Attention', color: '#FDCB6E', badgeClass: 'attention' }
    : workloadScore >= 30 ? { label: 'On Track', color: '#00D67E', badgeClass: 'ok' }
    : { label: 'Light Day', color: '#74B9FF', badgeClass: 'ok' };

  const scoreLabel =
    workloadScore >= 85 ? 'Overloaded'
    : workloadScore >= 65 ? 'Moderate'
    : workloadScore >= 30 ? 'On Track' : 'Light';

  const streakDays = 7;
  const inProgress = todaySchedules.find((s) => !s.is_completed);

  const today = new Date();
  const todayDow = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDow);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const scheduleDayMap: Record<string, Schedule[]> = {};
  [...todaySchedules, ...upcomingSchedules].forEach((s) => {
    const key = new Date(s.start_time).toDateString();
    if (!scheduleDayMap[key]) scheduleDayMap[key] = [];
    scheduleDayMap[key].push(s);
  });

  const todayLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const weekRange = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const insightText = latestAnalysis?.summary
    ? latestAnalysis.summary.slice(0, 60) + (latestAnalysis.summary.length > 60 ? '…' : '')
    : upcomingSchedules.length > 0
    ? `${upcomingSchedules.length} upcoming items — tap to review your week`
    : 'Add schedules to get AI workload insights';

  const circumference = 2 * Math.PI * 22.5;
  const strokeOffset = circumference * (1 - workloadScore / 100);

  return (
    <div className="page">
      {/* SVG gradient definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C6AF0"/>
            <stop offset="100%" stopColor="#2DD4BF"/>
          </linearGradient>
          <linearGradient id="gGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7B6CF6"/>
            <stop offset="100%" stopColor="#5AABF0"/>
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="hdr">
        <div className="hdr-info">
          <h2>{GREETING()}, {firstName}</h2>
          <p className="hdr-role">{profile?.role_title ?? 'Civil Engineer · Entrepreneur'}</p>
        </div>
        <Link href="/profile" className="av">
          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
        </Link>
      </div>

      <div className="scrl">

        {/* ═══ WIDGET 1 · Today Card ═══ */}
        <div className="widget">
          <div className="today-card" onClick={() => setTodayExpanded(!todayExpanded)}>
            <div className="tc-hdr">
              <div>
                <div className="tc-date-lbl">{todayLabel}</div>
                <div className="tc-day-lbl">{todayDayName} · {totalToday} activities</div>
              </div>
              {workloadStatus.badgeClass === 'attention' ? (
                <div className="tc-status-badge attention">Attention</div>
              ) : (
                <div className="tc-status-badge ok">On Track</div>
              )}
            </div>

            {/* Focus bar */}
            {inProgress ? (
              <div className="tc-focus-bar" onClick={(e) => e.stopPropagation()}>
                <div className="tc-focus-icon">▶</div>
                <div className="tc-focus-info">
                  <div className="tc-focus-name">{inProgress.title}</div>
                  <div className="tc-prog-row">
                    <div className="tc-prog-bar"><div className="tc-prog-fill" style={{ width: `${progressPct}%` }} /></div>
                    <span className="tc-prog-txt">{progressPct}% · In Progress</span>
                  </div>
                </div>
                <div className="tc-focus-time">{formatTime(inProgress.start_time)}</div>
              </div>
            ) : (
              <div className="tc-focus-bar no-task" onClick={(e) => e.stopPropagation()}>
                <div className="tc-focus-icon" style={{ opacity: .4 }}>◎</div>
                <div className="tc-focus-info">
                  <div className="tc-focus-name" style={{ opacity: .5 }}>No active task</div>
                  <div className="tc-prog-row">
                    <div className="tc-prog-bar"><div className="tc-prog-fill" style={{ width: `${progressPct}%` }} /></div>
                    <span className="tc-prog-txt">{progressPct}% of today done</span>
                  </div>
                </div>
              </div>
            )}

            {/* Insight bar */}
            <Link href="/ai-analysis" className="tc-insight-bar" onClick={(e) => e.stopPropagation()}>
              <div className="tc-ins-ico">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M8 2L3.5 8H7L6 12.5L10.5 6.5H7.2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="tc-ins-text">{insightText}</div>
              <div className="tc-ins-arrow">›</div>
            </Link>
          </div>

          {/* Expandable task list */}
          {todayExpanded && (
            <div className="ts-exp">
              {todaySchedules.length === 0 ? (
                <div className="ts-empty">
                  <Link href="/schedule/new" className="ts-add-cta">+ Add your first task</Link>
                </div>
              ) : (
                todaySchedules.map((s) => (
                  <div
                    key={s.id}
                    className={`tli ${s.is_completed ? 'done' : ''}`}
                    onClick={() => toggleComplete(s)}
                  >
                    <div className="tli-time">
                      {formatTime(s.start_time).split(' ')[0]}<br/>
                      {formatTime(s.start_time).split(' ')[1]}
                    </div>
                    <div className="tli-dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
                    <div className="tli-info">
                      <div className="tli-title">{s.title}</div>
                      <div className="tli-sub">{TYPE_ICONS[s.type]} {s.end_time ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : formatTime(s.start_time)}</div>
                    </div>
                    <div
                      className="tli-dur"
                      style={{
                        background: s.priority === 'high' ? 'rgba(255,107,138,.15)' : s.priority === 'medium' ? 'rgba(253,203,110,.15)' : 'rgba(45,212,191,.15)',
                        color: s.priority === 'high' ? '#FF6B8A' : s.priority === 'medium' ? '#FDCB6E' : '#2DD4BF',
                      }}
                    >
                      {s.priority.toUpperCase()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ═══ WIDGET 2 · Performance Card ═══ */}
        <div className="widget">
          <div className="perf-card" onClick={() => setPerfExpanded(!perfExpanded)}>
            <div className="pc-summary">
              <div className="pc-left">
                <div className="pc-ring">
                  <svg className="pc-ring-svg" viewBox="0 0 54 54" width="54" height="54">
                    <circle className="pc-ring-bg" cx="27" cy="27" r="22.5" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="4"/>
                    <circle
                      cx="27" cy="27" r="22.5" fill="none"
                      stroke="url(#scoreGrad)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      transform="rotate(-90 27 27)"
                      style={{ transition: 'stroke-dashoffset .6s ease' }}
                    />
                  </svg>
                  <div className="pc-score-num">{workloadScore}</div>
                </div>
                <div className="pc-info">
                  <div className="pc-hdline">{scoreLabel}</div>
                  <div className="pc-sub">
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ display:'inline',verticalAlign:'middle',marginRight:3 }}>
                      <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    {streakDays}-day streak · {totalToday} tasks today
                  </div>
                </div>
              </div>
              <div className="ts-chev" style={{ transform: perfExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>⌄</div>
            </div>

            {perfExpanded && (
              <div className="pc-grid">
                <div className="pc-gstat"><div className="pc-gval">{workloadScore}</div><div className="pc-glbl">Score</div></div>
                <div className="pc-gsep" />
                <div className="pc-gstat"><div className="pc-gval">{totalToday}</div><div className="pc-glbl">Tasks</div></div>
                <div className="pc-gsep" />
                <div className="pc-gstat"><div className="pc-gval">{completedToday}</div><div className="pc-glbl">Done</div></div>
                <div className="pc-gsep" />
                <div className="pc-gstat">
                  <div className="pc-gval" style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    {streakDays}
                  </div>
                  <div className="pc-glbl">Streak</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ WIDGET 3 · Weekly Schedule ═══ */}
        <div className="widget">
          <Link href="/calendar" className="wk-widget" style={{ textDecoration:'none' }}>
            <div className="wk-w-hdr">
              <div>
                <div className="wk-w-ttl">Weekly Schedule</div>
                <div className="wk-w-meta">{weekRange} · {upcomingSchedules.length} tasks</div>
              </div>
              <div className="wk-w-arr" style={{ color:'rgba(255,255,255,.3)', fontSize:18 }}>→</div>
            </div>
            <div className="wk-w-strip">
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const hasItems = !!scheduleDayMap[d.toDateString()];
                const isHot = (scheduleDayMap[d.toDateString()]?.length ?? 0) >= 4;
                const dotColor = isHot ? '#FF6B8A' : hasItems ? '#7C6AF0' : undefined;
                return (
                  <div key={i} className={`wk-wd ${isToday ? 'today' : isHot ? 'hot' : hasItems ? 'has' : ''}`}>
                    <div className="wk-wd-lbl">{DAY_LABELS[i]}</div>
                    <div className="wk-wd-num">{d.getDate()}</div>
                    <div className="wk-wd-dot" style={{ background: dotColor ?? 'transparent' }} />
                  </div>
                );
              })}
            </div>
            <div className="wk-w-foot">
              <span className="wk-w-sum">
                {upcomingSchedules.length > 0 ? `${upcomingSchedules.length} items this week` : 'Nothing scheduled'}
              </span>
              <span className="wk-w-act">Full view</span>
            </div>
          </Link>
        </div>

        {/* ═══ WIDGET 4 · Workload Balance Graph ═══ */}
        <div className="widget">
          <div className="wl-card">
            <div className="wl-hdr">
              <div>
                <div className="wl-title">Workload Balance</div>
                <div className="wl-subtitle">Week of {weekRange}</div>
              </div>
              <div className="wl-legend">
                <div className="wl-leg-item"><div className="wl-leg-dot" style={{ background:'#2DD4BF' }}/><span>Light</span></div>
                <div className="wl-leg-item"><div className="wl-leg-dot" style={{ background:'#7C6AF0' }}/><span>OK</span></div>
                <div className="wl-leg-item"><div className="wl-leg-dot" style={{ background:'#FF6B8A' }}/><span>Full</span></div>
              </div>
            </div>
            <div className="wl-chart">
              {weekDays.map((d, i) => {
                const load = WEEK_WORKLOAD[i];
                const isToday = d.toDateString() === today.toDateString();
                const barColor = load >= 90 ? '#FF6B8A' : load >= 65 ? '#7C6AF0' : load >= 30 ? '#2DD4BF' : 'rgba(255,255,255,.1)';
                const barH = Math.max(4, Math.round((load / 100) * 64));
                return (
                  <div key={i} className="wl-bw">
                    <div
                      className="wl-bar"
                      style={{ height: barH, background: barColor, opacity: load < 10 ? 0.4 : 1 }}
                    />
                    <div className={`wl-dlbl ${isToday ? 'wl-today' : load >= 90 ? 'wl-warn' : ''}`}>
                      {DAY_LABELS[i].slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="wl-note">
              <div className="wl-note-dot" style={{ background: '#FF6B8A' }} />
              {WEEK_WORKLOAD.indexOf(Math.max(...WEEK_WORKLOAD)) !== todayDow
                ? `${DAY_LABELS[WEEK_WORKLOAD.indexOf(Math.max(...WEEK_WORKLOAD))]}'s schedule looks heaviest — consider spreading tasks out`
                : 'Today is your heaviest day — pace yourself'}
            </div>
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>

      <BottomNav />

      <style jsx>{`
        .page {
          min-height: 100vh; background: #060610;
          display: flex; flex-direction: column;
          color: #E8EEFF; font-family: 'Sora', 'DM Sans', system-ui, sans-serif;
        }

        /* Header */
        .hdr {
          padding: 52px 22px 14px;
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-shrink: 0; position: relative;
        }
        .hdr::after {
          content: ''; position: absolute;
          top: -40px; left: 50%; transform: translateX(-50%);
          width: 280px; height: 140px;
          background: radial-gradient(ellipse, rgba(123,108,246,.12) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .hdr-info { position: relative; z-index: 1; }
        .hdr-info h2 { font-size: 20px; font-weight: 700; color: #E8EEFF; letter-spacing: -.3px; }
        .hdr-role { font-size: 12px; color: #6B7399; margin-top: 3px; font-weight: 500; }
        .av {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #7B6CF6, #5AABF0);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; color: #fff;
          cursor: pointer; box-shadow: 0 4px 16px rgba(123,108,246,.4);
          position: relative; z-index: 1; text-decoration: none; flex-shrink: 0;
        }

        /* Scroll area */
        .scrl {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 4px 18px 100px;
          -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .scrl::-webkit-scrollbar { display: none; }

        /* Widget spacing */
        .widget { margin-bottom: 12px; }

        /* ── Today Card ── */
        .today-card {
          background: #0D0C1A; border-radius: 16px; padding: 15px 16px 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,.4); cursor: pointer;
          border: 1.5px solid rgba(255,255,255,.05); transition: background .18s;
        }
        .today-card:active { background: #131222; }
        .tc-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 11px; }
        .tc-date-lbl { font-size: 20px; font-weight: 900; color: #E8EEFF; letter-spacing: -.5px; line-height: 1; }
        .tc-day-lbl { font-size: 11px; color: #6B7399; font-weight: 500; margin-top: 3px; }

        .tc-status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 100px; padding: 4px 10px;
          font-size: 10px; font-weight: 700; flex-shrink: 0; letter-spacing: .3px;
        }
        .tc-status-badge.attention {
          background: rgba(255,69,96,.11); color: #FF6B8A;
          border: 1px solid rgba(255,69,96,.22);
        }
        .tc-status-badge.attention::before {
          content: ''; width: 5px; height: 5px; border-radius: 50%;
          background: #FF6B8A; display: inline-block;
          animation: pulseDot 1.4s ease-in-out infinite;
        }
        @keyframes pulseDot {
          0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}
        }
        .tc-status-badge.ok {
          background: rgba(45,212,191,.1); color: #2DD4BF;
          border: 1px solid rgba(45,212,191,.22);
        }

        .tc-focus-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 11px; background: #060610; border-radius: 12px;
          margin-bottom: 8px; cursor: default;
        }
        .tc-focus-icon { font-size: 14px; color: #7C6AF0; font-weight: 700; flex-shrink: 0; }
        .tc-focus-info { flex: 1; min-width: 0; }
        .tc-focus-name { font-size: 12px; font-weight: 700; color: #E8EEFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tc-prog-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
        .tc-prog-bar { flex: 1; height: 3px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }
        .tc-prog-fill { height: 100%; background: linear-gradient(90deg, #7B6CF6, #5AABF0); border-radius: 2px; transition: width .6s ease; }
        .tc-prog-txt { font-size: 10px; color: #6B7399; font-weight: 600; white-space: nowrap; }
        .tc-focus-time { font-size: 11px; color: #6B7399; font-weight: 600; flex-shrink: 0; }
        .no-task { opacity: .7; }

        .tc-insight-bar {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 10px;
          background: rgba(253,203,110,.07); border-left: 3px solid #FDCB6E;
          cursor: pointer; transition: background .15s; text-decoration: none;
        }
        .tc-insight-bar:active { background: rgba(253,203,110,.14); }
        .tc-ins-ico { font-size: 13px; flex-shrink: 0; color: #FDCB6E; }
        .tc-ins-text { flex: 1; font-size: 11px; font-weight: 600; color: #E8EEFF; line-height: 1.4; }
        .tc-ins-arrow {
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(123,108,246,.15); color: #7C6AF0;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 700; flex-shrink: 0; line-height: 1;
        }

        /* Expandable task list */
        .ts-exp { margin-top: 8px; display: flex; flex-direction: column; gap: 7px; }
        .ts-empty { padding: 12px; text-align: center; }
        .ts-add-cta {
          padding: 9px 20px; background: linear-gradient(135deg,#7B6CF6,#5AABF0);
          border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none;
        }
        .tli {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px 12px 0; background: #0D0C1A;
          border-radius: 16px; cursor: pointer;
          transition: transform .15s, background .15s;
          border: 1px solid rgba(255,255,255,.05); position: relative; overflow: hidden;
        }
        .tli::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: linear-gradient(135deg, #7B6CF6, #5AABF0); border-radius: 3px 0 0 3px;
        }
        .tli:active { transform: scale(.98); background: #131222; }
        .tli.done { opacity: .45; }
        .tli-time { width: 44px; font-size: 10px; font-weight: 600; color: #35394F; text-align: center; flex-shrink: 0; line-height: 1.3; padding-left: 8px; }
        .tli-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .tli-info { flex: 1; }
        .tli-title { font-size: 13px; font-weight: 600; color: #E8EEFF; }
        .tli-sub { font-size: 11px; color: #6B7399; margin-top: 2px; font-weight: 400; }
        .tli-dur { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; margin-right: 8px; }

        /* ── Performance Card ── */
        .perf-card {
          background: #0D0C1A; border-radius: 16px; padding: 14px 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,.4); border: 1.5px solid rgba(255,255,255,.05);
          cursor: pointer; transition: background .18s;
        }
        .perf-card:active { background: #131222; }
        .pc-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pc-left { display: flex; align-items: center; gap: 10px; flex: 1; }
        .pc-ring { width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; }
        .pc-ring-svg { position: absolute; top: 0; left: 0; }
        .pc-score-num { position: relative; z-index: 1; font-size: 14px; font-weight: 700; color: #E8EEFF; }
        .pc-info { flex: 1; }
        .pc-hdline { font-size: 14px; font-weight: 700; color: #E8EEFF; }
        .pc-sub { font-size: 11px; color: #6B7399; font-weight: 500; margin-top: 2px; }
        .ts-chev { font-size: 18px; color: #6B7399; line-height: 1; }
        .pc-grid {
          display: flex; margin-top: 12px; padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,.05);
        }
        .pc-gstat { flex: 1; text-align: center; }
        .pc-gval { font-size: 18px; font-weight: 800; color: #E8EEFF; display: flex; align-items: center; justify-content: center; gap: 3px; }
        .pc-glbl { font-size: 10px; color: #6B7399; margin-top: 2px; font-weight: 600; }
        .pc-gsep { width: 1px; background: rgba(255,255,255,.05); margin: 4px 0; flex-shrink: 0; }

        /* ── Weekly Widget ── */
        .wk-widget {
          display: block; background: #0D0C1A; border-radius: 16px; padding: 14px 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,.4); border: 1.5px solid rgba(255,255,255,.05);
          cursor: pointer; transition: background .18s;
        }
        .wk-widget:active { background: #131222; }
        .wk-w-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .wk-w-ttl { font-size: 14px; font-weight: 800; color: #E8EEFF; }
        .wk-w-meta { font-size: 11px; color: #6B7399; font-weight: 500; margin-top: 2px; }
        .wk-w-strip { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; margin-bottom: 10px; }
        .wk-wd { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .wk-wd-lbl { font-size: 9px; font-weight: 700; color: #35394F; }
        .wk-wd-num {
          width: 28px; height: 28px; border-radius: 8px; font-size: 12px; font-weight: 700;
          color: #6B7399; display: flex; align-items: center; justify-content: center;
          border: 1px solid transparent;
        }
        .wk-wd.today .wk-wd-lbl { color: #7C6AF0; }
        .wk-wd.today .wk-wd-num { background: #7C6AF0; color: #fff; }
        .wk-wd.hot .wk-wd-num { border-color: #FF6B8A; color: #FF6B8A; }
        .wk-wd.has .wk-wd-num { color: #E8EEFF; }
        .wk-wd-dot { width: 4px; height: 4px; border-radius: 50%; }
        .wk-w-foot { display: flex; align-items: center; justify-content: space-between; }
        .wk-w-sum { font-size: 11px; color: #6B7399; font-weight: 500; }
        .wk-w-act { font-size: 11px; font-weight: 700; color: #7C6AF0; }

        /* ── Workload Graph ── */
        .wl-card {
          background: #0D0C1A; border-radius: 16px; padding: 15px 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,.4); border: 1.5px solid rgba(255,255,255,.05);
        }
        .wl-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .wl-title { font-size: 14px; font-weight: 800; color: #E8EEFF; }
        .wl-subtitle { font-size: 11px; color: #6B7399; font-weight: 500; margin-top: 2px; }
        .wl-legend { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .wl-leg-item { display: flex; align-items: center; gap: 3px; }
        .wl-leg-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .wl-leg-item span { font-size: 9px; color: #6B7399; font-weight: 600; }
        .wl-chart {
          display: flex; gap: 5px; align-items: flex-end;
          height: 82px; position: relative; padding-bottom: 18px;
        }
        .wl-chart::after {
          content: ''; position: absolute; bottom: 18px; left: 0; right: 0;
          height: 1px; background: rgba(255,255,255,.05);
        }
        .wl-bw { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; position: relative; }
        .wl-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 3px; transition: height .5s ease; }
        .wl-dlbl { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: 700; color: #35394F; white-space: nowrap; }
        .wl-today { color: #7C6AF0; }
        .wl-warn { color: #FF6B8A; }
        .wl-note { display: flex; align-items: center; gap: 6px; margin-top: 11px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.05); font-size: 11px; color: #6B7399; font-weight: 500; }
        .wl-note-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      `}</style>
    </div>
  );
}

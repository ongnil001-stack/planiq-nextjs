'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Schedule, AiAnalysis } from '@/types/database';
import BottomNav from '@/components/layout/BottomNav';

interface AnalysisResult {
  workload_score: number;
  summary: string;
  recommendations: { icon: string; title: string; detail: string }[];
  issues: { severity: string; title: string; detail: string }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  high: '#FF6B8A',
  medium: '#FDCB6E',
  low: '#00CEC9',
};

export default function AIAnalysisPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AiAnalysis | null>(null);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Load most recent saved analysis
      const { data: analysis } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setLastAnalysis(analysis);

      // Count schedules for this week
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { count } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('start_time', monday.toISOString())
        .lte('start_time', sunday.toISOString());

      setScheduleCount(count ?? 0);
      setLoadingPast(false);
    }
    loadData();
  }, []);

  async function runAnalysis() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    setLoading(true);
    setResult(null);

    // Fetch this week's schedules
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', monday.toISOString())
      .lte('start_time', sunday.toISOString())
      .order('start_time');

    if (!schedules || schedules.length === 0) {
      toast('No schedules this week to analyze. Add some first!');
      setLoading(false);
      return;
    }

    // Call Supabase Edge Function
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-schedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schedules,
          dateRange: {
            from: monday.toISOString(),
            to: sunday.toISOString(),
          },
        }),
      }
    );

    setLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      toast.error(`Analysis failed: ${err.error ?? res.statusText}`);
      return;
    }

    const data: AnalysisResult = await res.json();
    setResult(data);
    toast.success('Analysis complete!');
  }

  const displayResult: AnalysisResult | null = result ?? (lastAnalysis ? {
    workload_score: lastAnalysis.workload_score ?? 0,
    summary: lastAnalysis.summary ?? '',
    recommendations: (lastAnalysis.recommendations as AnalysisResult['recommendations']) ?? [],
    issues: (lastAnalysis.issues as AnalysisResult['issues']) ?? [],
  } : null);

  const scoreColor =
    !displayResult ? 'var(--mid)' :
    displayResult.workload_score >= 80 ? '#FF6B8A' :
    displayResult.workload_score >= 60 ? '#FDCB6E' :
    displayResult.workload_score >= 30 ? '#00CEC9' : 'var(--lite)';

  const scoreLabel =
    !displayResult ? '—' :
    displayResult.workload_score >= 80 ? 'Heavy' :
    displayResult.workload_score >= 60 ? 'Moderate' :
    displayResult.workload_score >= 30 ? 'Balanced' : 'Light';

  return (
    <div className="page">
      <div className="pg-header">
        <h1 className="pg-title">AI Analysis</h1>
        <span className="beta-badge">Beta</span>
      </div>

      <div className="content">
        {/* Trigger card */}
        <div className="trigger-card">
          <div className="trigger-top">
            <div className="ai-orb">✦</div>
            <div>
              <p className="trigger-title">Workload Analysis</p>
              <p className="trigger-sub">{scheduleCount} item{scheduleCount !== 1 ? 's' : ''} this week</p>
            </div>
          </div>
          <button
            className="btn-gradient analyze-btn"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spin-icon">⟳</span> Analyzing…
              </span>
            ) : '✦ Analyze My Week'}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="loading-state">
            <div className="ai-spinner">✦</div>
            <p className="load-title">Analyzing your schedule…</p>
            <p className="load-sub">Claude is reviewing your workload</p>
          </div>
        )}

        {/* Results */}
        {!loading && displayResult && (
          <>
            {!result && lastAnalysis && (
              <p className="stale-note">
                Showing last analysis from {new Date(lastAnalysis.created_at).toLocaleDateString()}
              </p>
            )}

            {/* Score card */}
            <div className="score-card">
              <div className="score-left">
                <p className="score-label">Workload Score</p>
                <p className="score-val" style={{ color: scoreColor }}>
                  {displayResult.workload_score}<span className="score-unit">/100</span>
                </p>
                <p className="score-status" style={{ color: scoreColor }}>{scoreLabel}</p>
              </div>
              <div className="score-ring-wrap">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--surf2)" strokeWidth="6"/>
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={scoreColor} strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - displayResult.workload_score / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset .6s ease' }}
                  />
                </svg>
              </div>
            </div>

            {/* Summary */}
            {displayResult.summary && (
              <div className="summary-card">
                <div className="summary-header">
                  <span className="ai-badge">✦ AI Summary</span>
                </div>
                <p className="summary-text">{displayResult.summary}</p>
              </div>
            )}

            {/* Issues */}
            {displayResult.issues?.length > 0 && (
              <>
                <p className="section-label">Issues Detected</p>
                {displayResult.issues.map((issue, i) => (
                  <div key={i} className="issue-card">
                    <div className="issue-bar" style={{ background: SEVERITY_COLORS[issue.severity] ?? '#ccc' }} />
                    <div>
                      <p className="issue-title">{issue.title}</p>
                      <p className="issue-detail">{issue.detail}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Recommendations */}
            {displayResult.recommendations?.length > 0 && (
              <>
                <p className="section-label">Recommendations</p>
                {displayResult.recommendations.map((rec, i) => (
                  <div key={i} className="rec-card">
                    <span className="rec-icon">{rec.icon}</span>
                    <div>
                      <p className="rec-title">{rec.title}</p>
                      <p className="rec-detail">{rec.detail}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {!loading && !displayResult && !loadingPast && (
          <div className="empty-ai">
            <div className="empty-orb">✦</div>
            <p className="empty-title">No analysis yet</p>
            <p className="empty-sub">Add some schedules for this week, then tap the button above to run your first AI analysis.</p>
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx>{`
        .page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .pg-header { padding: 52px 20px 16px; display: flex; align-items: center; gap: 12px; background: var(--surf); border-bottom: 1px solid var(--border); }
        .pg-title { font-size: 22px; font-weight: 800; color: var(--dark); flex: 1; }
        .beta-badge { padding: 4px 10px; background: var(--pur-lt); color: var(--purple); border-radius: 100px; font-size: 11px; font-weight: 700; }
        .content { flex: 1; padding: 16px; overflow-y: auto; padding-bottom: 90px; display: flex; flex-direction: column; gap: 12px; }
        .trigger-card { background: var(--surf); border-radius: 20px; padding: 20px; box-shadow: var(--card-sh2); }
        .trigger-top { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .ai-orb { width: 48px; height: 48px; background: var(--gradient); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; flex-shrink: 0; }
        .trigger-title { font-size: 16px; font-weight: 700; color: var(--dark); }
        .trigger-sub { font-size: 13px; color: var(--mid); margin-top: 2px; }
        .analyze-btn { width: 100%; padding: 15px; font-size: 15px; border-radius: 14px; }
        .spin-icon { display: inline-block; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; gap: 14px; }
        .ai-spinner { width: 72px; height: 72px; border-radius: 50%; background: var(--gradient); display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff; animation: spin 1.8s linear infinite; box-shadow: 0 10px 30px rgba(108,92,231,.3); }
        .load-title { font-size: 17px; font-weight: 700; color: var(--dark); }
        .load-sub { font-size: 13px; color: var(--mid); }
        .stale-note { font-size: 11px; color: var(--lite); text-align: center; }
        .score-card { background: var(--surf); border-radius: 20px; padding: 20px; box-shadow: var(--card-sh2); display: flex; align-items: center; justify-content: space-between; }
        .score-label { font-size: 12px; font-weight: 700; color: var(--mid); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
        .score-val { font-size: 42px; font-weight: 800; line-height: 1; }
        .score-unit { font-size: 18px; font-weight: 600; color: var(--lite); }
        .score-status { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .summary-card { background: var(--pur-lt); border-radius: 16px; padding: 16px; border-left: 3px solid var(--purple); }
        .summary-header { margin-bottom: 8px; }
        .ai-badge { background: var(--purple); color: #fff; border-radius: 6px; padding: 3px 9px; font-size: 11px; font-weight: 700; }
        .summary-text { font-size: 13px; color: #4A3FA8; line-height: 1.65; font-weight: 500; font-style: italic; }
        .section-label { font-size: 12px; font-weight: 700; color: var(--mid); text-transform: uppercase; letter-spacing: .8px; margin-top: 4px; }
        .issue-card { background: var(--surf); border-radius: 14px; padding: 14px 14px 14px 10px; display: flex; gap: 10px; box-shadow: var(--card-sh2); }
        .issue-bar { width: 4px; border-radius: 4px; align-self: stretch; min-height: 30px; flex-shrink: 0; }
        .issue-title { font-size: 14px; font-weight: 700; color: var(--dark); }
        .issue-detail { font-size: 12px; color: var(--mid); margin-top: 3px; line-height: 1.5; }
        .rec-card { background: var(--surf); border-radius: 14px; padding: 14px; display: flex; gap: 12px; box-shadow: var(--card-sh2); }
        .rec-icon { font-size: 24px; flex-shrink: 0; }
        .rec-title { font-size: 14px; font-weight: 700; color: var(--dark); }
        .rec-detail { font-size: 12px; color: var(--mid); margin-top: 3px; line-height: 1.5; }
        .empty-ai { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; gap: 12px; text-align: center; }
        .empty-orb { width: 80px; height: 80px; background: var(--gradient-soft); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: var(--purple); }
        .empty-title { font-size: 18px; font-weight: 700; color: var(--dark); }
        .empty-sub { font-size: 13px; color: var(--mid); line-height: 1.6; max-width: 280px; }
      `}</style>
    </div>
  );
}

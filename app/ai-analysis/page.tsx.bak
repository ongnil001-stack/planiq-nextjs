'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { AiAnalysis } from '@/types/database';
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
  low: '#00D67E',
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

      const { data: analysis } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setLastAnalysis(analysis);

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
    setLoading(true);
    setResult(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        toast.error(err.error || 'Analysis failed');
        setLoading(false);
        return;
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
      toast.success('Analysis complete!');
    } catch {
      toast.error('Network error. Try again.');
    }
    setLoading(false);
  }

  const displayResult: AnalysisResult | null = result ?? (lastAnalysis ? {
    workload_score: lastAnalysis.workload_score ?? 0,
    summary: lastAnalysis.summary ?? '',
    recommendations: (lastAnalysis.recommendations as AnalysisResult['recommendations']) ?? [],
    issues: (lastAnalysis.issues as AnalysisResult['issues']) ?? [],
  } : null);

  const scoreColor =
    !displayResult ? 'rgba(255,255,255,0.3)' :
    displayResult.workload_score >= 80 ? '#FF6B8A' :
    displayResult.workload_score >= 60 ? '#FDCB6E' :
    displayResult.workload_score >= 30 ? '#00D67E' : '#74B9FF';

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
          <button className="analyze-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? (
              <span className="btn-inner"><span className="spin-icon">⟳</span> Analyzing…</span>
            ) : '✦ Analyze My Week'}
          </button>
        </div>

        {/* Loading */}
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
                Last analysis: {new Date(lastAnalysis.created_at).toLocaleDateString()}
              </p>
            )}

            {/* Score */}
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
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
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
                <span className="ai-badge">✦ AI Summary</span>
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
            <p className="empty-sub">Add schedules for this week, then tap Analyze above to run your first AI insight.</p>
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx>{`
        .page { min-height: 100vh; background: #0B0D1A; display: flex; flex-direction: column; font-family: 'Sora', sans-serif; color: #fff; }
        .pg-header { padding: 52px 20px 16px; display: flex; align-items: center; gap: 12px; background: #161829; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .pg-title { font-size: 22px; font-weight: 800; color: #fff; flex: 1; }
        .beta-badge { padding: 4px 10px; background: rgba(124,106,240,0.18); color: #A78BFA; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .content { flex: 1; padding: 16px; overflow-y: auto; padding-bottom: 90px; display: flex; flex-direction: column; gap: 12px; }
        .trigger-card { background: #161829; border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.07); }
        .trigger-top { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .ai-orb { width: 48px; height: 48px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; flex-shrink: 0; }
        .trigger-title { font-size: 16px; font-weight: 700; color: #fff; }
        .trigger-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .analyze-btn {
          width: 100%; padding: 15px; font-size: 15px; font-weight: 700;
          background: linear-gradient(135deg,#6C5CE7,#A78BFA); border: none; border-radius: 14px;
          color: #fff; font-family: inherit; cursor: pointer;
          box-shadow: 0 8px 24px rgba(108,92,231,0.4); transition: transform .15s;
        }
        .analyze-btn:disabled { opacity: 0.6; }
        .btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .spin-icon { display: inline-block; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; gap: 14px; }
        .ai-spinner { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg,#6C5CE7,#A78BFA); display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff; animation: spin 1.8s linear infinite; box-shadow: 0 10px 30px rgba(108,92,231,.35); }
        .load-title { font-size: 17px; font-weight: 700; color: #fff; }
        .load-sub { font-size: 13px; color: rgba(255,255,255,0.4); }
        .stale-note { font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; }
        .score-card { background: #161829; border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; }
        .score-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
        .score-val { font-size: 42px; font-weight: 800; line-height: 1; }
        .score-unit { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.25); }
        .score-status { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .summary-card { background: rgba(124,106,240,0.12); border-radius: 16px; padding: 16px; border: 1px solid rgba(124,106,240,0.25); }
        .ai-badge { background: #7C6AF0; color: #fff; border-radius: 6px; padding: 3px 9px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 10px; }
        .summary-text { font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.65; font-style: italic; }
        .section-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: .8px; margin-top: 4px; }
        .issue-card { background: #161829; border-radius: 14px; padding: 14px 14px 14px 10px; display: flex; gap: 10px; border: 1px solid rgba(255,255,255,0.07); }
        .issue-bar { width: 4px; border-radius: 4px; align-self: stretch; min-height: 30px; flex-shrink: 0; }
        .issue-title { font-size: 14px; font-weight: 700; color: #fff; }
        .issue-detail { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 3px; line-height: 1.5; }
        .rec-card { background: #161829; border-radius: 14px; padding: 14px; display: flex; gap: 12px; border: 1px solid rgba(255,255,255,0.07); }
        .rec-icon { font-size: 24px; flex-shrink: 0; }
        .rec-title { font-size: 14px; font-weight: 700; color: #fff; }
        .rec-detail { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 3px; line-height: 1.5; }
        .empty-ai { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; gap: 12px; text-align: center; }
        .empty-orb { width: 80px; height: 80px; background: rgba(124,106,240,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #7C6AF0; border: 1px solid rgba(124,106,240,0.25); }
        .empty-title { font-size: 18px; font-weight: 700; color: #fff; }
        .empty-sub { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.6; max-width: 280px; }
      `}</style>
    </div>
  );
}

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
        .page { min-height:100vh; background:var(--bg); display:flex; flex-direction:column; font-family:inherit; color:var(--dark); }
        .pg-header { padding:52px 20px 14px; background:var(--surf); border-bottom:1px solid var(--border); }
        .pg-title { font-size:22px; font-weight:800; color:var(--dark); }
        .pg-sub { font-size:13px; color:var(--mid); margin-top:3px; }
        .body { flex:1; overflow-y:auto; padding:16px 18px 100px; }
        .score-ring-wrap { display:flex; flex-direction:column; align-items:center; padding:20px 0 16px; }
        .score-ring { position:relative; display:flex; align-items:center; justify-content:center; }
        .score-ring-svg { display:block; }
        .score-num { position:absolute; font-size:28px; font-weight:800; color:var(--dark); }
        .score-label { font-size:13px; color:var(--mid); margin-top:8px; font-weight:600; }
        .analysis-card { background:var(--surf); border-radius:var(--rmd); padding:16px; margin-bottom:12px; border:1px solid var(--border); }
        .card-title { font-size:13px; font-weight:700; color:var(--dark); margin-bottom:10px; text-transform:uppercase; letter-spacing:.5px; }
        .summary-text { font-size:14px; color:var(--dark); line-height:1.6; font-weight:400; }
        .issue-row { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
        .issue-row:last-child { margin-bottom:0; }
        .issue-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:4px; }
        .issue-text { font-size:13px; color:var(--dark); line-height:1.5; flex:1; }
        .sev-bar-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .sev-bar-label { font-size:12px; color:var(--mid); width:80px; flex-shrink:0; font-weight:600; }
        .sev-bar-track { flex:1; height:6px; background:var(--border2); border-radius:3px; overflow:hidden; }
        .sev-bar-fill { height:100%; border-radius:3px; transition:width .6s ease; }
        .sev-pct { font-size:11px; color:var(--mid); width:32px; text-align:right; font-weight:700; }
        .reco-item { display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
        .reco-item:last-child { border-bottom:none; }
        .reco-num { width:22px; height:22px; border-radius:50%; background:var(--pur-lt); color:var(--purple); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .reco-text { font-size:13px; color:var(--dark); line-height:1.5; flex:1; font-weight:500; }
        .run-btn {
          width:100%; padding:15px; margin-top:4px;
          background:var(--gradient); border:none; border-radius:var(--rmd);
          color:#fff; font-size:15px; font-weight:700;
          font-family:inherit; cursor:pointer; transition:opacity .18s;
          box-shadow:var(--card-sh);
        }
        .run-btn:active { opacity:.85; }
        .run-btn:disabled { opacity:.5; cursor:not-allowed; }
        .loading-wrap { display:flex; flex-direction:column; align-items:center; padding:48px 0; gap:14px; }
        .spin { width:36px; height:36px; border:3px solid var(--border2); border-top-color:var(--purple); border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .loading-txt { font-size:14px; color:var(--mid); font-weight:600; }
      `}</style>
    </div>
  );
}

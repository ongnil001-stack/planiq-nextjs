// ═══════════════════════════════════════════════════════════
// PlanIQ — Supabase Edge Function: analyze-schedule  v2
//
// Actions:
//   weekly_analysis  → workload score + recommendations (Dashboard)
//   daily_brief      → AI-powered focus brief (FocusHub)
//   smart_suggest    → conflict detection + best times (AddSchedule)
//
// Deploy:  supabase functions deploy analyze-schedule
// Secret:  supabase secrets set "ANTHROPIC KEY"=sk-ant-...
// ═══════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  is_completed: boolean;
}

interface ProposedSchedule {
  title: string;
  type: string;
  priority: string;
  start_time: string;
  end_time: string | null;
  duration_minutes?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtItem(s: ScheduleItem) {
  const start = new Date(s.start_time).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const end  = s.end_time ? ` → ${new Date(s.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : '';
  const done = s.is_completed ? ' [DONE]' : '';
  return `• [${s.priority.toUpperCase()}] ${s.type}: "${s.title}" @ ${start}${end}${done}`;
}

async function callClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const key = Deno.env.get('ANTHROPIC KEY');
  if (!key) throw new Error('ANTHROPIC KEY secret not set in Supabase dashboard.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) { try { return JSON.parse(match[1]); } catch { /* fall through */ } }
  throw new Error('Claude did not return valid JSON. Raw: ' + raw.slice(0, 200));
}

// ─── Action: weekly_analysis ──────────────────────────────────────────────────

async function weeklyAnalysis(schedules: ScheduleItem[], dateRange: { from: string; to: string }) {
  if (!schedules.length) {
    return { workload_score: 0, summary: 'No schedules found for this period.', recommendations: [], issues: [] };
  }

  const scheduleText = schedules.map(fmtItem).join('\n');
  const completed = schedules.filter(s => s.is_completed).length;

  const prompt = `You are PlanIQ's AI Schedule Advisor. Analyze this weekly schedule and provide actionable insights.

DATE RANGE: ${dateRange.from} to ${dateRange.to}
TOTAL ITEMS: ${schedules.length}   COMPLETED: ${completed}

SCHEDULE:
${scheduleText}

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "workload_score": <0-100 integer, 0=empty 100=overloaded>,
  "summary": "<2-3 sentence plain-English summary of workload and patterns>",
  "recommendations": [
    { "icon": "<emoji>", "title": "<short title>", "detail": "<1-2 sentence actionable advice>" },
    { "icon": "<emoji>", "title": "<short title>", "detail": "<1-2 sentence actionable advice>" },
    { "icon": "<emoji>", "title": "<short title>", "detail": "<1-2 sentence actionable advice>" }
  ],
  "issues": [
    { "severity": "high|medium|low", "title": "<issue title>", "detail": "<brief description>" }
  ]
}

Focus on: overloading, conflicts, high-priority clustering, missing breaks, task-type balance.`;

  const raw = await callClaude(prompt);
  return parseJson(raw);
}

// ─── Action: daily_brief ──────────────────────────────────────────────────────

async function dailyBrief(schedules: ScheduleItem[], mode: 'today' | 'week' = 'today') {
  const now     = new Date();
  const today   = now.toISOString().slice(0, 10);
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

  let inScope: ScheduleItem[];
  let scopeLabel: string;

  if (mode === 'today') {
    inScope    = schedules.filter(s => s.start_time.slice(0, 10) === today);
    scopeLabel = `today (${dayName}, ${today})`;
  } else {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    inScope    = schedules.filter(s => { const d = new Date(s.start_time); return d >= weekStart && d <= weekEnd; });
    scopeLabel = `this week (${weekStart.toDateString()} - ${weekEnd.toDateString()})`;
  }

  if (!inScope.length) {
    return {
      headline: mode === 'today' ? 'All clear today — great time to plan ahead!' : 'Nothing scheduled this week.',
      items: [{
        type: 'suggestion',
        title: 'Add your first item',
        body: 'Tap "Add Schedule" below to get started and let PlanIQ help you stay on track.',
        accent: '#00C6FF',
      }],
    };
  }

  const pending   = inScope.filter(s => !s.is_completed);
  const completed = inScope.filter(s => s.is_completed);
  const scheduleText = inScope.map(fmtItem).join('\n');

  const prompt = `You are PlanIQ's AI Focus Advisor. Generate a motivating, actionable daily brief for ${scopeLabel}.

SCOPE: ${scopeLabel}
TOTAL: ${inScope.length} items  |  PENDING: ${pending.length}  |  DONE: ${completed.length}

SCHEDULE:
${scheduleText}

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "headline": "<one energizing sentence summarizing the day or week — under 12 words>",
  "items": [
    {
      "type": "priority|conflict|suggestion|win",
      "title": "<concise card title — under 10 words>",
      "body": "<1-3 sentences of specific, actionable insight referencing actual schedule titles>",
      "accent": "<hex: #7C6AF0 for priority, #FF3B30 for conflict, #00C6FF for suggestion, #00C896 for win>"
    }
  ]
}

Rules:
- Generate 2-4 items that are genuinely useful (not generic platitudes)
- Mention specific schedule item titles when relevant
- If time overlaps exist, flag as type "conflict"
- If all items are done or scope is clear, use type "win"
- Keep body text concise and mobile-friendly (no bullet characters)`;

  const raw = await callClaude(prompt, 800);
  return parseJson(raw);
}

// ─── Action: smart_suggest ────────────────────────────────────────────────────

async function smartSuggest(existingSchedules: ScheduleItem[], proposed: ProposedSchedule) {
  if (!proposed.start_time) {
    return { has_conflicts: false, conflicts: [], suggestions: [{ text: 'Choose a start time to check for conflicts.', reason: '' }], best_times: [] };
  }

  const proposedStart = new Date(proposed.start_time);
  const proposedEnd   = proposed.end_time
    ? new Date(proposed.end_time)
    : new Date(proposedStart.getTime() + (proposed.duration_minutes ?? 60) * 60000);

  const sameDay     = existingSchedules.filter(s => s.start_time.slice(0, 10) === proposed.start_time.slice(0, 10));
  const scheduleText = sameDay.length ? sameDay.map(fmtItem).join('\n') : '(no other items scheduled on this day)';

  const startStr = proposedStart.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const endStr   = proposedEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const prompt = `You are PlanIQ's Smart Schedule AI. Check if the proposed item conflicts with existing schedules and suggest better alternatives.

PROPOSED ITEM:
  Title:    "${proposed.title}"
  Type:     ${proposed.type}
  Priority: ${proposed.priority}
  Start:    ${startStr}
  End:      ${endStr}

EXISTING ITEMS ON SAME DAY:
${scheduleText}

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "has_conflicts": <true|false>,
  "conflicts": [
    { "with_title": "<title of conflicting item>", "overlap_minutes": <integer>, "severity": "high|medium|low" }
  ],
  "suggestions": [
    { "text": "<short actionable suggestion under 10 words>", "reason": "<brief reason>" }
  ],
  "best_times": ["<HH:MM>", "<HH:MM>", "<HH:MM>"]
}

Rules:
- A conflict = time overlap OR two critical/high-priority items within 30 minutes
- best_times: 2-3 realistic alternative start times on same day (24-hour HH:MM), at least 30 min gap from existing items
- If no conflicts, return empty conflicts array and a positive suggestion
- Keep all text short and mobile-friendly`;

  const raw = await callClaude(prompt, 600);
  return parseJson(raw);
}


// ─── Action: reschedule_suggest ───────────────────────────────────────────────

async function rescheduleSuggest(schedules: ScheduleItem[]) {
  if (schedules.length < 2) {
    return { optimizations: [], summary: 'Not enough schedule data to suggest optimizations.' };
  }

  const scheduleText = schedules
    .filter(s => !s.is_completed)
    .map(s => {
      const start = new Date(s.start_time);
      const end   = s.end_time ? new Date(s.end_time) : null;
      const dur   = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 60;
      return `ID:${s.id} | [${s.priority.toUpperCase()}] ${s.type} "${s.title}" | ${start.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} ${start.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}${end ? ` → ${end.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}` : ''} (${dur}min)`;
    })
    .join('\n');

  const prompt = `You are PlanIQ's Smart Reschedule AI. Analyze these schedule items and identify specific, concrete moves that would reduce overload, fix conflicts, and improve time balance.

PENDING SCHEDULE ITEMS:
${scheduleText}

Your job: identify 2-4 specific items that should be moved to a better time slot. For each, provide the exact schedule ID, current time, and a specific suggested new time on a different or less-loaded day.

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "optimizations": [
    {
      "schedule_id": "<exact ID from the list above>",
      "schedule_title": "<title of the item>",
      "current_day": "<e.g. Monday>",
      "current_time": "<HH:MM 24h>",
      "current_date": "<YYYY-MM-DD>",
      "suggested_day": "<e.g. Tuesday>",
      "suggested_time": "<HH:MM 24h — specific slot, not vague>",
      "suggested_date": "<YYYY-MM-DD — must be same week>",
      "reason": "<1 sentence: why this move helps, referencing actual schedule data>",
      "impact": "<1 short phrase: what improves, e.g. 'Frees up Monday morning'>",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "<1 sentence overview of the optimization opportunity>"
}

Rules:
- Only suggest moves for items that genuinely benefit from moving (overloaded days, conflicts, late-night scheduling of daytime tasks)
- suggested_date must be a real date in the same week as the item
- suggested_time must be a realistic working-hours slot (07:00–21:00) that is not already occupied
- If the schedule looks well-balanced, return 0-1 optimizations and say so in the summary
- Do not suggest moving completed items`;

  const raw = await callClaude(prompt, 1000);
  return parseJson(raw);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      action?: string;
      schedules: ScheduleItem[];
      dateRange?: { from: string; to: string };
      mode?: 'today' | 'week';
      proposed?: ProposedSchedule;
    };

    const action = body.action ?? 'weekly_analysis';
    let result: unknown;

    if (action === 'daily_brief') {
      result = await dailyBrief(body.schedules ?? [], body.mode ?? 'today');

    } else if (action === 'smart_suggest') {
      if (!body.proposed) throw new Error('smart_suggest requires a "proposed" schedule object');
      result = await smartSuggest(body.schedules ?? [], body.proposed);

    } else if (action === 'reschedule_suggest') {
      result = await rescheduleSuggest(body.schedules ?? []);

    } else {
      // weekly_analysis (default)
      const dateRange = body.dateRange ?? { from: 'this week', to: 'this week' };
      result = await weeklyAnalysis(body.schedules ?? [], dateRange);

      // Persist to ai_analyses table
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const r = result as Record<string, unknown>;
      await serviceClient.from('ai_analyses').insert({
        user_id: user.id,
        analysis_date: new Date().toISOString().split('T')[0],
        workload_score: r.workload_score,
        summary: r.summary,
        recommendations: r.recommendations,
        issues: r.issues,
        raw_response: JSON.stringify(result),
      }).then(() => {/* fire-and-forget */});
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

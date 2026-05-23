// ═══════════════════════════════════════════════════════════
// PlanIQ — Supabase Edge Function: analyze-schedule
// Receives schedule data, calls Anthropic Claude API,
// returns workload analysis + recommendations.
//
// Deploy: supabase functions deploy analyze-schedule
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client to verify user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { schedules, dateRange } = await req.json() as {
      schedules: ScheduleItem[];
      dateRange: { from: string; to: string };
    };

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({
          workload_score: 0,
          summary: 'No schedules found for this period.',
          recommendations: [],
          issues: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt for Claude
    const scheduleText = schedules
      .map((s) => {
        const start = new Date(s.start_time).toLocaleString();
        const end = s.end_time ? ` → ${new Date(s.end_time).toLocaleString()}` : '';
        const done = s.is_completed ? ' [DONE]' : '';
        return `• [${s.priority.toUpperCase()}] ${s.type.toUpperCase()}: "${s.title}" — ${start}${end}${done}`;
      })
      .join('\n');

    const prompt = `You are PlanIQ's AI Schedule Advisor. Analyze the following schedule and provide actionable insights.

DATE RANGE: ${dateRange.from} to ${dateRange.to}
TOTAL ITEMS: ${schedules.length}
COMPLETED: ${schedules.filter((s) => s.is_completed).length}

SCHEDULE:
${scheduleText}

Respond ONLY with valid JSON in exactly this format (no markdown, no extra text):
{
  "workload_score": <0-100 integer, 0=empty, 100=completely overloaded>,
  "summary": "<2-3 sentence plain English summary of the week's workload and patterns>",
  "recommendations": [
    { "icon": "<emoji>", "title": "<short title>", "detail": "<1-2 sentence actionable advice>" },
    { "icon": "<emoji>", "title": "<short title>", "detail": "<1-2 sentence actionable advice>" },
    { "icon": "<emoji>", "title": "<short title>", "detail": "<1-2 sentence actionable advice>" }
  ],
  "issues": [
    { "severity": "high|medium|low", "title": "<issue title>", "detail": "<brief description>" }
  ]
}

Focus on: overloading, scheduling conflicts, high-priority clustering, lack of breaks, balance between task types.`;

    // Call Anthropic Claude API
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY secret not set. Run: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...');
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text ?? '';

    // Parse the JSON response from Claude
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // If Claude returned markdown-wrapped JSON, strip it
      const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = match ? JSON.parse(match[1]) : { summary: rawText, workload_score: 50, recommendations: [], issues: [] };
    }

    // Save the analysis to DB
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await serviceClient.from('ai_analyses').insert({
      user_id: user.id,
      analysis_date: new Date().toISOString().split('T')[0],
      workload_score: parsed.workload_score,
      summary: parsed.summary,
      recommendations: parsed.recommendations,
      issues: parsed.issues,
      raw_response: rawText,
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

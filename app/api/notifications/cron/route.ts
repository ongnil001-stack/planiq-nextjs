// ─── Notification Cron Handler ────────────────────────────────────────────────
// Called every minute by Vercel Cron (or Supabase pg_cron via Edge Function).
// Finds schedules whose reminder time falls within the current 60-second window
// and sends a Web Push notification to all subscribed devices of those users.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { expandRecurring } from '@/lib/recurrence';
import type { Schedule } from '@/types/database';

// Configure VAPID lazily inside the handler. Doing this at module scope would
// throw at import time (and break `next build`) whenever the VAPID keys are not
// present in the environment.
function configureVapid() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_MAILTO ?? 'hello@planiq.app'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

// Use service-role key — this never reaches the browser
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  // Protect the endpoint — Vercel injects CRON_SECRET automatically for cron jobs
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }
  configureVapid();

  const supabase = getAdminClient();
  const now = new Date();
  // 62-second window (slightly over 1 minute to avoid edge gaps)
  const windowEnd = new Date(now.getTime() + 62_000);

  const leadCapMs  = 3 * 60 * 60 * 1000;                 // max reminder lead time supported
  const upperBound = new Date(windowEnd.getTime() + leadCapMs);
  const nowMs = now.getTime(), windowEndMs = windowEnd.getTime();
  // A reminder fires when (start - reminder_minutes) falls inside [now, windowEnd).
  const inWindow = (startISO: string, mins: number) => {
    const notifyAt = new Date(startISO).getTime() - mins * 60_000;
    return notifyAt >= nowMs && notifyAt < windowEndMs;
  };

  interface DueItem { id: string; user_id: string; title: string; start_time: string; location: string | null; timezone: string | null; occ_date: string }
  const due: DueItem[] = [];

  // 1) Non-recurring schedules whose reminder lands in the window
  const { data: plain, error: schedErr } = await supabase
    .from('schedules')
    .select('id, user_id, title, start_time, location, timezone, reminder_minutes, all_day')
    .gt('reminder_minutes', 0)
    .is('recurrence_rule', null)
    .eq('is_completed', false)
    .gte('start_time', now.toISOString())
    .lte('start_time', upperBound.toISOString());
  if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 });

  for (const s of plain ?? []) {
    if (s.all_day) continue;
    if (inWindow(s.start_time, s.reminder_minutes ?? 0)) {
      due.push({ id: s.id, user_id: s.user_id, title: s.title, start_time: s.start_time, location: s.location, timezone: s.timezone, occ_date: s.start_time.slice(0, 10) });
    }
  }

  // 2) Recurring schedules — expand occurrences into the lead window so reminders
  //    fire for each occurrence, not just the original base date.
  const { data: masters } = await supabase
    .from('schedules')
    .select('id, user_id, title, start_time, end_time, location, timezone, reminder_minutes, all_day, recurrence_rule, recurrence_end, excluded_dates')
    .gt('reminder_minutes', 0)
    .not('recurrence_rule', 'is', null)
    .or(`recurrence_end.is.null,recurrence_end.gte.${now.toISOString().slice(0, 10)}`);

  for (const m of masters ?? []) {
    if (m.all_day) continue;
    const mins = m.reminder_minutes ?? 0;
    if (mins <= 0) continue;
    // Dates the user has skipped ("delete this occurrence")
    let excluded: string[] = [];
    try { excluded = m.excluded_dates ? JSON.parse(m.excluded_dates) : []; } catch { /* ignore */ }
    // expandRecurring already drops excluded virtuals; include the base explicitly
    // but honor exclusions for it too.
    const candidates = [m.start_time, ...expandRecurring(m as Schedule, now, upperBound).map(o => o.start_time)];
    for (const startISO of candidates) {
      const occDate = startISO.slice(0, 10);
      if (excluded.includes(occDate)) continue;
      if (inWindow(startISO, mins)) {
        due.push({ id: m.id, user_id: m.user_id, title: m.title, start_time: startISO, location: m.location, timezone: m.timezone, occ_date: occDate });
      }
    }
  }

  // Drop occurrences the user already completed (per-occurrence completion table)
  if (due.length) {
    const ids = Array.from(new Set(due.map(d => d.id)));
    const { data: comps } = await supabase
      .from('schedule_completions')
      .select('schedule_id, occurrence_date')
      .in('schedule_id', ids);
    const done = new Set((comps ?? []).map((c: { schedule_id: string; occurrence_date: string }) => `${c.schedule_id}|${c.occurrence_date}`));
    for (let i = due.length - 1; i >= 0; i--) {
      if (done.has(`${due[i].id}|${due[i].occ_date}`)) due.splice(i, 1);
    }
  }

  if (!due.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const sched of due) {
    // Get all push subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', sched.user_id);

    if (!subs?.length) continue;

    const startLocal = new Date(sched.start_time).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: sched.timezone ?? 'UTC',
    });

    const payload = JSON.stringify({
      title: `⏰ ${sched.title}`,
      body:  `Starting at ${startLocal}${sched.location ? ` · ${sched.location}` : ''}`,
      tag:   `planiq-${sched.id}-${sched.occ_date}`,
      url:   '/calendar',
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        // 410 Gone = subscription expired — clean up
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({ sent, due: due.length });
}

// ─── Notification Cron Handler ────────────────────────────────────────────────
// Called every minute by Vercel Cron (or Supabase pg_cron via Edge Function).
// Finds schedules whose reminder time falls within the current 60-second window
// and sends a Web Push notification to all subscribed devices of those users.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configure VAPID once at module scope
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_MAILTO ?? 'hello@planiq.app'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

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

  const supabase = getAdminClient();
  const now = new Date();
  // 62-second window (slightly over 1 minute to avoid edge gaps)
  const windowEnd = new Date(now.getTime() + 62_000);

  // Find schedules where (start_time - reminder_minutes) falls in [now, windowEnd]
  const { data: dueSched, error: schedErr } = await supabase
    .from('schedules')
    .select('id, user_id, title, start_time, location, timezone, reminder_minutes')
    .gt('reminder_minutes', 0)
    .gte('start_time', now.toISOString()) // event hasn't started yet
    .filter(
      'start_time',
      'lte',
      // start_time <= windowEnd + reminder_minutes (upper bound — we filter precisely below)
      new Date(windowEnd.getTime() + 3 * 60 * 60 * 1000).toISOString()
    );

  if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 });

  // Precise filter: reminder fires when (start_time - reminder_minutes) is within window
  const due = (dueSched ?? []).filter(s => {
    const startMs    = new Date(s.start_time).getTime();
    const notifyAtMs = startMs - (s.reminder_minutes ?? 0) * 60_000;
    return notifyAtMs >= now.getTime() && notifyAtMs < windowEnd.getTime();
  });

  if (!due.length) return NextResponse.json({ sent: 0, checked: dueSched?.length ?? 0 });

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
      tag:   `planiq-${sched.id}`,
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

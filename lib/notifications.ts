/**
 * lib/notifications.ts
 * ─────────────────────────────────────────────────────────────
 * Client-side helpers for PlanIQ activity notifications.
 *
 * Architecture:
 *   • Permission is requested via the standard Notification API.
 *   • Scheduling is delegated to the Service Worker via postMessage
 *     so notifications fire even when the PWA is backgrounded.
 *   • For a completely-closed PWA you'd need Web Push (VAPID) —
 *     that's a future upgrade; this covers all minimised / background cases.
 */

const STORAGE_KEY = 'planiq_notifications_enabled';

// ── Preference helpers ────────────────────────────────────────────────────────

export function isNotificationsEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

export function setNotificationsEnabled(enabled: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false'); } catch {}
}

// ── Permission ────────────────────────────────────────────────────────────────

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Ask for permission; returns true if granted. */
export async function requestPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Service-worker bridge ─────────────────────────────────────────────────────

async function getSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.ready; } catch { return null; }
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

export interface NotifScheduleItem {
  id: string;
  title: string;
  start_time: string | null; // "HH:MM" or "HH:MM:SS"
  is_completed?: boolean | null;
}

/** Milliseconds until a given "HH:MM" time today. Returns negative if past. */
function msUntilTime(timeStr: string): number {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return target.getTime() - now.getTime();
}

/** Schedule a notification for a single activity. No-op if already past. */
export async function scheduleNotification(item: NotifScheduleItem): Promise<void> {
  if (!item.start_time || item.is_completed) return;
  const delay = msUntilTime(item.start_time);
  if (delay <= 0) return;

  const sw = await getSW();
  if (!sw?.active) return;

  const displayTime = item.start_time.slice(0, 5); // "HH:MM"
  sw.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    payload: {
      tag:   `planiq-schedule-${item.id}`,
      title: `▶ ${item.title}`,
      body:  `Your activity starts at ${displayTime}`,
      delay,
      url:   '/dashboard',
    },
  });
}

/**
 * Cancel all pending SW notifications, then reschedule every pending
 * (not completed, not past) activity for today.
 */
export async function scheduleAllTodayNotifications(
  items: NotifScheduleItem[]
): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;

  const sw = await getSW();
  if (!sw?.active) return;

  // Wipe previous batch
  sw.active.postMessage({ type: 'CANCEL_ALL_NOTIFICATIONS', payload: {} });

  let scheduled = 0;
  for (const item of items) {
    if (!item.start_time || item.is_completed) continue;
    const delay = msUntilTime(item.start_time);
    if (delay <= 0) continue;

    const displayTime = item.start_time.slice(0, 5);
    sw.active.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      payload: {
        tag:   `planiq-schedule-${item.id}`,
        title: `▶ ${item.title}`,
        body:  `Your activity starts at ${displayTime}`,
        delay,
        url:   '/dashboard',
      },
    });
    scheduled++;
  }
  return; // returns void; caller can ignore
}

/** Cancel all queued SW notifications immediately. */
export async function cancelAllNotifications(): Promise<void> {
  const sw = await getSW();
  if (!sw?.active) return;
  sw.active.postMessage({ type: 'CANCEL_ALL_NOTIFICATIONS', payload: {} });
}

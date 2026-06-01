// ─── PlanIQ Notification Utilities ───────────────────────────────────────────
// Handles: permission, push subscriptions, foreground polling, legacy compat.

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

const ENABLED_KEY = 'planiq_notifications_enabled';

// ── Support checks ────────────────────────────────────────────────────────
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function notificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return 'denied';
  return Notification.permission;
}

/** Legacy alias used by ProfileClient */
export function getNotificationPermission(): NotificationPermission {
  return notificationPermission();
}

// ── User preference (localStorage) ───────────────────────────────────────
export function isNotificationsEnabled(): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  return localStorage.getItem(ENABLED_KEY) !== 'false';
}

export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

// ── Permission ────────────────────────────────────────────────────────────
export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

// ── VAPID key conversion ──────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

// ── Push subscription ─────────────────────────────────────────────────────
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    });
  } catch (err) {
    console.error('[PlanIQ] Push subscribe failed:', err);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await sub.unsubscribe().catch(() => {});
  await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
}

export async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  try {
    const json = sub.toJSON();
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    });
    return res.ok;
  } catch { return false; }
}

// Full setup: permission → subscribe → save
export async function setupPushNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  const permission = await requestPermission();
  if (permission !== 'granted') return 'denied';
  setNotificationsEnabled(true);
  const sub = await subscribeToPush();
  if (sub) await saveSubscription(sub);
  return 'granted';
}

// ── Cancel all scheduled (setTimeout-based) notifications ────────────────
const _timers: ReturnType<typeof setTimeout>[] = [];

export function cancelAllNotifications(): void {
  _timers.forEach(t => clearTimeout(t));
  _timers.length = 0;
  // Clear the dedupe set too so reminders can be re-armed from fresh start_times
  // after a reschedule/edit (the dedupe key is id+mins and ignores start_time).
  _scheduled.clear();
}

// ── Schedule notifications for today's items ──────────────────────────────
// Called by DashboardClient on mount/change. Uses setTimeout for foreground use.
interface ScheduleLike {
  id: string;
  title: string;
  start_time: string;
  reminder_minutes?: number | null;
  location?: string | null;
  timezone?: string | null;
}

const _scheduled = new Set<string>();

export function scheduleAllTodayNotifications(schedules: ScheduleLike[]): void {
  if (!isNotificationsEnabled()) return;
  const now = Date.now();
  for (const s of schedules) {
    const mins = s.reminder_minutes ?? 15;
    if (mins <= 0) continue;
    const notifyAt = new Date(s.start_time).getTime() - mins * 60_000;
    const delay = notifyAt - now;
    const key = `${s.id}-${mins}`;
    if (delay <= 0 || delay > 8 * 60 * 60_000 || _scheduled.has(key)) continue;
    _scheduled.add(key);
    const t = setTimeout(() => {
      if (!isNotificationsEnabled()) return;
      const startLocal = new Date(s.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: s.timezone ?? undefined,
      });
      const n = new Notification(`⏰ ${s.title}`, {
        body: `Starting at ${startLocal}${s.location ? ` · ${s.location}` : ''}`,
        icon: '/icons/icon-192.png',
        tag: key,
      });
      n.onclick = () => { window.focus(); n.close(); };
    }, delay);
    _timers.push(t);
  }
}

// ── Foreground polling (used by CalendarClient) ───────────────────────────
// Checks schedules right now — used for 90-second sliding window check.
const _notified = new Set<string>();

export function checkAndNotify(schedules: ScheduleLike[]): void {
  if (!isNotificationsEnabled()) return;
  const now = Date.now();
  for (const s of schedules) {
    const mins = s.reminder_minutes ?? 0;
    if (mins <= 0) continue;
    const notifyAt = new Date(s.start_time).getTime() - mins * 60_000;
    const key = `${s.id}-${mins}`;
    if (now >= notifyAt && now < notifyAt + 90_000 && !_notified.has(key)) {
      _notified.add(key);
      const startLocal = new Date(s.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: s.timezone ?? undefined,
      });
      const n = new Notification(`⏰ ${s.title}`, {
        body: `Starting at ${startLocal}${s.location ? ` · ${s.location}` : ''}`,
        icon: '/icons/icon-192.png',
        tag: key,
      });
      n.onclick = () => { window.focus(); n.close(); };
    }
  }
}

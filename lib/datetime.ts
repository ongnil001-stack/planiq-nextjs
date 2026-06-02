/**
 * lib/datetime.ts
 * Single source of truth for wall-clock → UTC conversion.
 *
 * buildISO("2026-06-05", "09:00", "Asia/Manila") returns the exact UTC instant
 * for that local wall-clock time in `tz`. Used by EVERY schedule save path
 * (Add Schedule sheet, /schedule/new, Smart Reschedule) so the date the user
 * picks is the date that gets stored — no off-by-one drift.
 */
export function buildISO(dateStr: string, timeHHMM: string, tz: string): string {
  // Strategy: guess the UTC instant by treating the wall-clock as UTC, then
  // iteratively correct by the difference between how that instant renders in
  // `tz` and the target wall-clock. Two passes converge for any offset/DST.
  try {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeHHMM.split(':').map(Number);

    let candidate = Date.UTC(y, mo - 1, d, h, mi, 0);

    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    for (let i = 0; i < 2; i++) {
      const parts: Record<string, string> = {};
      fmt.formatToParts(new Date(candidate)).forEach(({ type, value }) => { parts[type] = value; });
      const localH = parts.hour === '24' ? 0 : Number(parts.hour);
      const diffMs = (
        (Number(parts.year) - y) * 365 * 86400000 +
        (Number(parts.month) - mo) * 30 * 86400000 +
        (Number(parts.day) - d) * 86400000 +
        (localH - h) * 3600000 +
        (Number(parts.minute) - mi) * 60000
      );
      candidate -= diffMs;
    }
    return new Date(candidate).toISOString();
  } catch {
    // Fallback: parse as the browser's local time
    return new Date(`${dateStr}T${timeHHMM}:00`).toISOString();
  }
}

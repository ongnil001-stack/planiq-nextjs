import { getOfficialHolidays } from './holidays-official';

export interface Holiday {
  date: string;        // "YYYY-MM-DD"
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

const CACHE_PREFIX = 'planiq_holidays_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  data: Holiday[];
  fetchedAt: number;
}

function cacheKey(year: number, countryCode: string) {
  return `${CACHE_PREFIX}${countryCode}_${year}`;
}

function readCache(year: number, countryCode: string): Holiday[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(year, countryCode));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch { return null; }
}

function writeCache(year: number, countryCode: string, data: Holiday[]) {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    localStorage.setItem(cacheKey(year, countryCode), JSON.stringify(entry));
  } catch { /* storage full — skip cache */ }
}

export async function getHolidays(year: number, countryCode: string): Promise<Holiday[]> {
  if (!countryCode) return [];

  // Check official government-sourced overrides first (most accurate)
  const official = getOfficialHolidays(year, countryCode);
  if (official) return official;

  // Fall back to Nager.Date API with cache
  const cached = readCache(year, countryCode);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`
    );
    if (!res.ok) return [];
    const data: Holiday[] = await res.json();
    writeCache(year, countryCode, data);
    return data;
  } catch { return []; }
}

/** Returns the Holiday object if the date is a holiday, otherwise null */
export function findHoliday(dateStr: string, holidays: Holiday[]): Holiday | null {
  return holidays.find(h => h.date === dateStr) ?? null;
}

/** Build a Map of "YYYY-MM-DD" → Holiday for fast lookups */
export function buildHolidayMap(holidays: Holiday[]): Map<string, Holiday> {
  return new Map(holidays.map(h => [h.date, h]));
}

/** Format date as YYYY-MM-DD */
export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

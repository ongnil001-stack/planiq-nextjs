// ─── PlanIQ geo detection utility ────────────────────────────────────────────
// Uses real GPS coordinates + BigDataCloud reverse geocoding (free, no API key)
// to return both the IANA timezone AND the human-readable city name.
//
// Why BigDataCloud?  Free tier, no key, works in-browser, good city accuracy.
// Docs: https://www.bigdatacloud.com/reverse-geocoding

export interface GeoResult {
  timezone: string;         // IANA tz, e.g. "Asia/Manila"
  city: string;             // e.g. "Cagayan de Oro"
  region: string;           // e.g. "Northern Mindanao"
  country: string;          // ISO2 code, e.g. "PH"
  countryName: string;      // e.g. "Philippines"
  displayLabel: string;     // e.g. "Cagayan de Oro, PH"
  source: 'gps' | 'fallback';
  latitude: number;
  longitude: number;
}

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  localityInfo?: { administrative?: { name: string; description?: string }[] };
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryCode?: string;
  countryName?: string;
}

/**
 * Requests device GPS, then reverse-geocodes coordinates via BigDataCloud.
 * Returns a GeoResult with real city name and timezone.
 *
 * Falls back to OS timezone + empty city if GPS is denied or geocoding fails.
 */
export function detectLocation(
  onSuccess: (result: GeoResult) => void,
  onError:   (message: string)   => void,
) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError('Geolocation is not supported on this device.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      // Device OS timezone — always correct for scheduling, even without geocoding
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);

        const data: BigDataCloudResponse = await res.json();

        // Best city name: city > locality > first admin level 3+ > principalSubdivision
        const city =
          data.city ||
          data.locality ||
          data.localityInfo?.administrative?.find(a => a.description?.includes('city') || a.description?.includes('municipality'))?.name ||
          data.principalSubdivision ||
          '';

        const region      = data.principalSubdivision || '';
        const country     = data.countryCode || '';
        const countryName = data.countryName || '';
        const displayLabel = city
          ? `${city}${country ? `, ${country}` : ''}`
          : countryName || timezone;

        onSuccess({
          timezone, city, region, country, countryName,
          displayLabel, source: 'gps', latitude, longitude,
        });

      } catch {
        // Geocoding failed — still return timezone + coordinates, just no city
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        onSuccess({
          timezone: tz,
          city: '', region: '', country: '', countryName: '',
          displayLabel: tz,
          source: 'fallback',
          latitude, longitude,
        });
      }
    },
    (err) => {
      const msgs: Record<number, string> = {
        1: 'Location permission denied. Please allow location access in your browser settings.',
        2: 'Location unavailable. Check that your device location is turned on.',
        3: 'Location request timed out. Please try again.',
      };
      onError(msgs[err.code] ?? `Location error: ${err.message}`);
    },
    {
      enableHighAccuracy: true,   // use GPS chip, not just network/IP
      timeout: 12000,
      maximumAge: 300000,         // cache for 5 min
    }
  );
}

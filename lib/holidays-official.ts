/**
 * Official holiday overrides sourced from government proclamations.
 * These take precedence over the Nager.Date API which may have errors.
 *
 * Philippines: Proclamation No. 1006 signed by Executive Secretary Lucas Bersamin
 * Source: https://pco.gov.ph/issuances/proclamation-no-1006-declaring-the-regular-holidays-and-special-non-working-days-for-the-year-2026/
 * Official Gazette: https://www.officialgazette.gov.ph/nationwide-holidays/2026/
 */

import type { Holiday } from './holidays';

type OfficialHolidayMap = {
  [countryCode: string]: {
    [year: number]: Holiday[];
  };
};

export const OFFICIAL_HOLIDAYS: OfficialHolidayMap = {
  PH: {
    2026: [
      // ── Regular Holidays (Proclamation No. 1006) ──────────────────
      { date: '2026-01-01', localName: 'Araw ng Bagong Taon',          name: "New Year's Day",                    countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },
      { date: '2026-04-02', localName: 'Huwebes Santo',                 name: 'Maundy Thursday',                   countryCode: 'PH', fixed: false, global: true,  types: ['Public'] },
      { date: '2026-04-03', localName: 'Biyernes Santo',                name: 'Good Friday',                       countryCode: 'PH', fixed: false, global: true,  types: ['Public'] },
      { date: '2026-04-09', localName: 'Araw ng Kagitingan',            name: 'Day of Valor',                      countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },
      { date: '2026-05-01', localName: 'Araw ng Paggawa',               name: 'Labor Day',                         countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },
      { date: '2026-06-12', localName: 'Araw ng Kalayaan',              name: 'Independence Day',                  countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },
      { date: '2026-08-31', localName: 'Araw ng mga Bayani',            name: 'National Heroes Day',               countryCode: 'PH', fixed: false, global: true,  types: ['Public'] },
      { date: '2026-11-30', localName: 'Araw ni Gat Andres Bonifacio', name: 'Bonifacio Day',                     countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },
      { date: '2026-12-25', localName: 'Pasko',                         name: 'Christmas Day',                     countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },
      { date: '2026-12-30', localName: 'Araw ni Dr. Jose Rizal',        name: 'Rizal Day',                         countryCode: 'PH', fixed: true,  global: true,  types: ['Public'] },

      // ── Special Non-Working Days (Proclamation No. 1006) ──────────
      { date: '2026-02-17', localName: 'Bagong Taon ng mga Tsino',      name: 'Chinese New Year',                  countryCode: 'PH', fixed: false, global: false, types: ['Optional'] },
      { date: '2026-04-04', localName: 'Sabado de Gloria',              name: 'Black Saturday',                    countryCode: 'PH', fixed: false, global: false, types: ['Optional'] },
      { date: '2026-08-21', localName: 'Araw ni Ninoy Aquino',          name: 'Ninoy Aquino Day',                  countryCode: 'PH', fixed: true,  global: false, types: ['Optional'] },
      { date: '2026-11-01', localName: 'Araw ng Lahat ng mga Santo',    name: "All Saints' Day",                   countryCode: 'PH', fixed: true,  global: false, types: ['Optional'] },
      { date: '2026-11-02', localName: 'Araw ng mga Kaluluwa',          name: "All Souls' Day",                    countryCode: 'PH', fixed: true,  global: false, types: ['Optional'] },
      { date: '2026-12-08', localName: 'Araw ng Mahal na Birhen',       name: 'Feast of the Immaculate Conception',countryCode: 'PH', fixed: true,  global: false, types: ['Optional'] },
      { date: '2026-12-24', localName: 'Bisperas ng Pasko',             name: 'Christmas Eve',                     countryCode: 'PH', fixed: true,  global: false, types: ['Optional'] },
      { date: '2026-12-31', localName: 'Bisperas ng Bagong Taon',       name: "New Year's Eve",                    countryCode: 'PH', fixed: true,  global: false, types: ['Optional'] },
    ],
  },
};

/**
 * Get official holidays for a country/year, or null if not available.
 * When available, these override the Nager.Date API response entirely.
 */
export function getOfficialHolidays(year: number, countryCode: string): Holiday[] | null {
  return OFFICIAL_HOLIDAYS[countryCode.toUpperCase()]?.[year] ?? null;
}

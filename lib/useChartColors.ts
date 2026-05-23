'use client';

import { useState, useEffect } from 'react';

export interface ChartColors {
  /** Primary accent — used for rings, main bars, series 1 */
  c1: string;
  /** Secondary accent — gradient end, series 2 */
  c2: string;
  /** "OK / balanced" status color */
  ok: string;
  /** "Mid / moderate" status color */
  mid: string;
  /** "Warning / attention" status color */
  warn: string;
  /** "Full / overloaded" status color */
  full: string;
  /** Empty / zero bar placeholder */
  empty: string;
  /** Grid lines */
  grid: string;
  /** Axis labels */
  axis: string;
  /** Tooltip background */
  tooltip: string;
  /** Series 3, 4, 5 */
  c3: string;
  c4: string;
  c5: string;
}

function readColors(): ChartColors {
  if (typeof window === 'undefined') {
    // SSR fallback — focused theme defaults
    return {
      c1: '#00C6FF', c2: '#0066FF', c3: '#00E5C0', c4: '#FFB830', c5: '#FF5C7A',
      ok: '#00E5C0', mid: '#00C6FF', warn: '#FFB830', full: '#FF5C7A',
      empty: 'rgba(0,198,255,0.10)', grid: 'rgba(0,198,255,0.08)',
      axis: 'rgba(255,255,255,0.25)', tooltip: 'rgba(8,14,26,0.92)',
    };
  }
  const s = getComputedStyle(document.body);
  const v = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;

  return {
    c1:      v('--chart-1',       '#00C6FF'),
    c2:      v('--chart-2',       '#0066FF'),
    c3:      v('--chart-3',       '#00E5C0'),
    c4:      v('--chart-4',       '#FFB830'),
    c5:      v('--chart-5',       '#FF5C7A'),
    ok:      v('--chart-ok',      '#00E5C0'),
    mid:     v('--chart-mid',     '#00C6FF'),
    warn:    v('--chart-warn',    '#FFB830'),
    full:    v('--chart-full',    '#FF5C7A'),
    empty:   v('--chart-empty',   'rgba(0,198,255,0.10)'),
    grid:    v('--chart-grid',    'rgba(0,198,255,0.08)'),
    axis:    v('--chart-axis',    'rgba(255,255,255,0.25)'),
    tooltip: v('--chart-tooltip', 'rgba(8,14,26,0.92)'),
  };
}

/**
 * Returns live chart colors sourced from CSS custom properties on document.body.
 * Automatically re-reads whenever the `data-theme` attribute changes so charts
 * update instantly when the user switches themes.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(readColors);

  useEffect(() => {
    // Initial read after hydration
    setColors(readColors());

    // Watch for data-theme changes on <body>
    const observer = new MutationObserver(() => {
      setColors(readColors());
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

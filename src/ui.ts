/**
 * ui.ts
 * -------------------------------------------------------------
 * Small presentation helpers shared across screens: how each result
 * band is colored and labeled, and a couple of formatting utilities.
 * Keeping these in one place keeps the screens consistent.
 */

import { colors } from './theme';
import { EventType, ResultBand } from './types';

export function bandColor(band: ResultBand): string {
  switch (band) {
    case 'optimal':
      return colors.optimal;
    case 'ok':
      return colors.ok;
    case 'watch':
      return colors.watch;
    case 'high':
      return colors.high;
    default:
      return colors.unknown;
  }
}

export function bandLabel(band: ResultBand): string {
  switch (band) {
    case 'optimal':
      return 'At longevity target';
    case 'ok':
      return 'Within guideline target';
    case 'watch':
      return 'In reference range · above target';
    case 'high':
      return 'Above reference range';
    default:
      return 'Unknown';
  }
}

export function eventTypeLabel(t: EventType): string {
  switch (t) {
    case 'original':
      return 'Original';
    case 'correction':
      return 'Correction';
    case 'retraction':
      return 'Retraction';
  }
}

export function eventTypeColor(t: EventType): string {
  switch (t) {
    case 'original':
      return colors.ok;
    case 'correction':
      return colors.watch;
    case 'retraction':
      return colors.high;
  }
}

/** e.g. "2026-06-02" -> "2 Jun 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** e.g. a ms timestamp -> "2 Jun 2026, 14:03". */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Trim trailing zeros from a normalized value for display. */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

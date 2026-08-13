/**
 * theme.ts
 * -------------------------------------------------------------
 * One central place for colors, spacing, and text sizes.
 * Keeping these here (instead of hard-coding "#0E9F84" all over
 * the app) means you can restyle the whole app by editing ONE file.
 */

export const colors = {
  // Backgrounds
  background: '#F3F7F6', // cool, clean off-white
  surface: '#FFFFFF', // cards
  surfaceAlt: '#E7F0EE',

  // Brand / accents (a fresh, clinical teal + warm coral)
  primary: '#0E9F84',
  primaryDark: '#0A7C68',
  accent: '#F2635A',

  // Text
  text: '#12211E',
  textMuted: '#5F726E',
  textOnPrimary: '#FFFFFF',

  // Feedback / status (used for lab ranges and scores)
  good: '#1AA179', // in optimal range
  warn: '#E1A100', // borderline
  bad: '#D1453B', // out of range
  danger: '#D1453B',
  border: '#DCE7E4',
};

/** Map a 0–100 score to a status color (green → amber → red). */
export function scoreColor(score: number): string {
  if (score >= 75) return colors.good;
  if (score >= 50) return colors.warn;
  return colors.bad;
}

// A consistent spacing scale (multiples of 4). Use spacing.md, spacing.lg, etc.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Text sizes used across the app.
export const fontSize = {
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  huge: 44,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
};

/**
 * theme.ts
 * -------------------------------------------------------------
 * One central place for colors, spacing, and text sizes.
 * Editing this ONE file restyles the whole app.
 *
 * LID (Living in Data) uses a calm, clinical palette: deep ink,
 * a clinical teal accent, and warm paper backgrounds. Status
 * colors are intentionally muted — this is an evidence system,
 * not a scoreboard.
 */

export const colors = {
  // Backgrounds
  background: '#F4F6F6', // cool clinical paper
  surface: '#FFFFFF', // cards
  surfaceAlt: '#E8EDED',

  // Brand / accents (clinical teal + deep ink)
  primary: '#0E6E6E',
  primaryDark: '#0A5252',
  accent: '#1F7A8C',

  // Text
  text: '#12211F',
  textMuted: '#5C6B69',
  textOnPrimary: '#FFFFFF',

  // Status bands (used for measurement/engine states — muted on purpose)
  optimal: '#0E7C5A', // longevity / optimal band
  ok: '#3A7CA5', // within guideline target
  watch: '#B7791F', // above guideline
  high: '#B3402A', // high / diagnostic concern
  unknown: '#7A7A7A', // legitimately UNKNOWN

  // Feedback
  danger: '#B3261E',
  border: '#DDE4E3',
};

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
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
};

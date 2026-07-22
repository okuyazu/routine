/**
 * theme.ts
 * -------------------------------------------------------------
 * One central place for colors, spacing, and text sizes.
 * Keeping these here (instead of hard-coding "#4B3F72" all over
 * the app) means you can restyle the whole app by editing ONE file.
 */

export const colors = {
  // Backgrounds
  background: '#F6F4EF', // warm paper-like background
  surface: '#FFFFFF', // cards
  surfaceAlt: '#EFEBE2',

  // Brand / accents (a calm, scholarly purple + gold)
  primary: '#4B3F72',
  primaryDark: '#362C57',
  accent: '#C9A227',

  // Text
  text: '#1F1B2E',
  textMuted: '#6B6577',
  textOnPrimary: '#FFFFFF',

  // Feedback
  danger: '#B3261E',
  border: '#E3DED3',
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

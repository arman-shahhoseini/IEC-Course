/**
 * Design Tokens 2.0 — the canonical source of truth for all visual tokens.
 *
 * Mirrors `src/styles.css` CSS custom properties + adds JS-only tokens
 * (elevation, icon sizes, motion presets) that CSS doesn't express well.
 *
 * NO CHANGES to `src/styles.css` — the CSS remains the runtime source.
 * This file is the TypeScript companion for JS-side logic and tooling.
 */

/* ------------------------------------------------------------------ */
/* Colors                                                              */
/* ------------------------------------------------------------------ */

export const colors = {
  white: "#ffffff",
  background: "#fafafa",
  surface: "#f5f5f7",
  border: "#ececec",
  foreground: "#1d1d1f",
  paragraph: "#6e6e73",
  primary: "#c1121f",
  primaryHover: "#a30e18",
  gold: "#c9a961",
  success: "#22c55e",
} as const;

/* ------------------------------------------------------------------ */
/* Status Colors                                                       */
/* ------------------------------------------------------------------ */

export const statusColors = {
  pending: { fg: "#b45309", bg: "#fef3e2" },
  success: { fg: "#15803d", bg: "#e8f7ee" },
  rejected: { fg: "#b91c1c", bg: "#fdeceb" },
  draft: { fg: "#6e6e73", bg: "#f5f5f7" },
} as const;

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export const typography = {
  fontFamily:
    '"Vazirmatn Variable", "IRANSansX", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontDisplay: '"Vazirmatn Variable", "IRANSansX", ui-sans-serif, system-ui',
  // Heading sizes (rem)
  h1: "3rem",
  h2: "2.25rem",
  h3: "1.75rem",
  h4: "1.5rem",
  h5: "1.25rem",
  h6: "1.125rem",
  // Body sizes
  body: "0.9375rem",
  bodySmall: "0.8125rem",
  caption: "0.75rem",
  // Font weights
  weightNormal: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
  weightExtrabold: 800,
  // Letter spacing
  headingTracking: "-0.02em",
  bodyTracking: "-0.005em",
} as const;

/* ------------------------------------------------------------------ */
/* Font Sizes (standalone, for programmatic use)                       */
/* ------------------------------------------------------------------ */

export const fontSizes = {
  xs: "0.75rem", // 12px
  sm: "0.8125rem", // 13px
  base: "0.9375rem", // 15px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.75rem", // 28px
  "4xl": "2.25rem", // 36px
  "5xl": "3rem", // 48px
} as const;

/* ------------------------------------------------------------------ */
/* Radius                                                              */
/* ------------------------------------------------------------------ */

export const radius = {
  btn: "18px",
  card: "24px",
  lg: "18px",
  md: "12px",
  sm: "8px",
  xl: "24px",
  "2xl": "28px",
  "3xl": "32px",
} as const;

/* ------------------------------------------------------------------ */
/* Spacing                                                             */
/* ------------------------------------------------------------------ */

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const;

/* ------------------------------------------------------------------ */
/* Shadows                                                             */
/* ------------------------------------------------------------------ */

export const shadows = {
  card: "0 1px 2px 0 rgba(29, 29, 31, 0.04), 0 8px 24px -8px rgba(29, 29, 31, 0.08)",
  cardHover:
    "0 4px 8px 0 rgba(29, 29, 31, 0.06), 0 24px 48px -12px rgba(29, 29, 31, 0.16)",
  float: "0 20px 60px -20px rgba(29, 29, 31, 0.18)",
  red: "0 12px 32px -12px rgba(193, 18, 31, 0.4)",
} as const;

/* ------------------------------------------------------------------ */
/* Elevation (semantic shadow levels)                                  */
/* ------------------------------------------------------------------ */

export const elevation = {
  0: "none",
  1: shadows.card,
  2: shadows.cardHover,
  3: shadows.float,
  4: shadows.red,
} as const;

/* ------------------------------------------------------------------ */
/* Breakpoints                                                         */
/* ------------------------------------------------------------------ */

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/* ------------------------------------------------------------------ */
/* Animation                                                           */
/* ------------------------------------------------------------------ */

export const animation = {
  duration: {
    instant: "75ms",
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
    slower: "700ms",
  },
  easing: {
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.22, 1, 0.36, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Motion Presets (Framer Motion compatible)                           */
/* ------------------------------------------------------------------ */

export const motion = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  slideInRight: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring" as const, damping: 30, stiffness: 300 },
  },
  slideInLeft: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
    transition: { type: "spring" as const, damping: 30, stiffness: 300 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
} as const;

/* ------------------------------------------------------------------ */
/* Icon Sizes                                                          */
/* ------------------------------------------------------------------ */

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

/* ------------------------------------------------------------------ */
/* Z-Index                                                             */
/* ------------------------------------------------------------------ */

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  navbar: 50,
  sidebar: 40,
  sheet: 50,
  dialog: 50,
  toast: 100,
  tooltip: 200,
} as const;

/* ------------------------------------------------------------------ */
/* Container Sizes                                                     */
/* ------------------------------------------------------------------ */

export const containerSizes = {
  page: "1440px",
  narrow: "640px",
  medium: "768px",
  wide: "1280px",
} as const;

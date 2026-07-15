/**
 * Motion presets — standardized Framer Motion variants.
 *
 * These are companions to the `motion` object in design-tokens.
 * Use these for consistent animations across the dashboard:
 *
 *   import { motion } from "framer-motion";
 *   import { motionPresets } from "@/shared/lib/motion-presets";
 *
 *   <motion.div {...motionPresets.fadeUp}>...</motion.div>
 *
 * All presets respect `prefers-reduced-motion` via the global CSS rule
 * in styles.css (animation-duration: 0.001ms !important).
 */

/* ------------------------------------------------------------------ */
/* Page transitions                                                    */
/* ------------------------------------------------------------------ */

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
};

/* ------------------------------------------------------------------ */
/* Stagger container                                                   */
/* ------------------------------------------------------------------ */

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

/* ------------------------------------------------------------------ */
/* Card hover                                                          */
/* ------------------------------------------------------------------ */

export const cardHover = {
  whileHover: {
    y: -4,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ------------------------------------------------------------------ */
/* List item enter                                                     */
/* ------------------------------------------------------------------ */

export const listItemEnter = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

/* ------------------------------------------------------------------ */
/* Scale in (for modals/dialogs)                                       */
/* ------------------------------------------------------------------ */

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

/* ------------------------------------------------------------------ */
/* Slide from right (RTL: visually from right edge)                    */
/* ------------------------------------------------------------------ */

export const slideFromRight = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { type: "spring" as const, damping: 30, stiffness: 300 },
};

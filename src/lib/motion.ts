/**
 * Shared animation presets for `motion` (framer-motion successor).
 * Import `m` for the animatable elements and these variants for consistency.
 *
 * Every consumer should also respect the user's reduce-motion setting — the
 * global CSS in index.css already neutralises CSS transitions/animations when
 * `:root[data-reduce-motion='true']`; for JS-driven springs use
 * `useReduce()` below to fall back to instant.
 */
import { useReducedMotion } from 'motion/react'

export { AnimatePresence } from 'motion/react'
export { motion as m } from 'motion/react'

/** Standard "ease-out-expo"-ish curve, as a typed 4-tuple. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Spring used for modals, popovers and anything that should feel physical. */
export const spring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.9 } as const

/** Quick easing for opacity / small moves. */
export const ease = { duration: 0.22, ease: EASE_OUT } as const

/** Fade + rise, for cards and list items appearing. */
export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: ease },
}

/** Container that staggers its children's `fadeUp`. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
}

/** Modal panel: scale + fade with a spring. */
export const modalPanel = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: ease },
}

export const backdrop = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: ease },
  exit: { opacity: 0, transition: ease },
}

/** Page/route transition. */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
}

/** Press feedback for buttons / clickable rows. */
export const press = { scale: 0.97 }
export const liftHover = { y: -2 }

/**
 * Returns true when animations should be suppressed (OS or in-app setting).
 * `useReducedMotion()` already reads `prefers-reduced-motion`; the in-app
 * toggle sets that indirectly via the CSS attribute + we also check the DOM.
 */
export function useReduce(): boolean {
  const os = useReducedMotion()
  const app =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-reduce-motion') === 'true'
  return Boolean(os || app)
}

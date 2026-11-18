import type { Transition, Variants } from 'framer-motion';

export const KINDRED_SPRING: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
  mass: 0.9,
};

export const SNAPPY_SPRING: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 28,
};

export const GENTLE_EASE = [0.22, 1, 0.36, 1] as const;

export const TAP_SCALE = { scale: 0.97 };
export const HOVER_LIFT = { y: -2 };

export const stageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.36, ease: GENTLE_EASE },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(3px)',
    transition: { duration: 0.2, ease: GENTLE_EASE },
  },
};

export const bentoGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const bentoCardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: KINDRED_SPRING,
  },
};

export const transcriptTurnVariants: Variants = {
  hidden: { opacity: 0, x: -8, y: 8 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: KINDRED_SPRING,
  },
};

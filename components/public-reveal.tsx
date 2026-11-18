"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Progressive enhancement: content remains visible without JS/animations. */
export function PublicReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.42, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

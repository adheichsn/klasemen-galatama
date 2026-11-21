"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

import {
  HERO_PHRASES,
  initialHeroFrame,
  nextHeroFrame,
  type HeroFrame,
} from "@/lib/hero-copy";

export function HeroTypewriter({ paused = false }: { paused?: boolean }) {
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState<HeroFrame>(initialHeroFrame);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (paused || reducedMotion || !visible) return;
    const { next, delay } = nextHeroFrame(frame);
    const timer = window.setTimeout(() => setFrame(next), delay);
    return () => window.clearTimeout(timer);
  }, [frame, paused, reducedMotion, visible]);
  return (
    <span className="weji-typewriter grid text-[#9BDFFF]">
      <span className="sr-only">{HERO_PHRASES[0]}</span>
      {/* Grid reserves enough space for all phrases at each viewport width. */}
      {HERO_PHRASES.map((phrase) => (
        <span
          key={phrase}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 select-none"
        >
          {phrase}
          <span className="weji-typewriter-space" />
        </span>
      ))}
      <span aria-hidden="true" className="col-start-1 row-start-1">
        <span className="weji-typewriter-animated">
          {HERO_PHRASES[frame.index].slice(0, frame.length)}
          <span
            className={`weji-typewriter-cursor${paused ? " is-paused" : ""}`}
          />
        </span>
        <span className="weji-typewriter-static">{HERO_PHRASES[0]}</span>
      </span>
    </span>
  );
}

export const HERO_PHRASES = [
  "Bersaing dan Raih Prestasi",
  "Tunjukkan Kemampuan Terbaikmu",
  "Ukir Sejarah Kemenanganmu",
  "Jadilah Bagian dari Kompetisi",
  "Mulai Perjalanan Menuju Kemenangan",
];
export type HeroFrame = { index: number; length: number; deleting: boolean };
export const initialHeroFrame: HeroFrame = {
  index: 0,
  length: HERO_PHRASES[0].length,
  deleting: false,
};
/** Pure animation step: full initial SSR text, then delete and type one character at a time. */
export function nextHeroFrame(frame: HeroFrame): {
  next: HeroFrame;
  delay: number;
} {
  const phrase = HERO_PHRASES[frame.index];
  if (frame.deleting && frame.length === 0)
    return {
      next: {
        index: (frame.index + 1) % HERO_PHRASES.length,
        length: 0,
        deleting: false,
      },
      delay: 180,
    };
  if (frame.deleting)
    return { next: { ...frame, length: frame.length - 1 }, delay: 30 };
  if (frame.length === phrase.length)
    return { next: { ...frame, deleting: true }, delay: 2500 };
  return { next: { ...frame, length: frame.length + 1 }, delay: 55 };
}

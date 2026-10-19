/** Seconds, CSS pixels, and pixels/second: gravity plus linear air resistance. */
export const celebration = { particles: 16, horizontalSpread: .72, duration: 1400, speed: 360, gravity: 400, drag: 1.25, fadeStart: .8 };

export function confettiKeyframes(index: number): Keyframe[] {
  const angle = Math.PI * (1.16 + .68 * index / (celebration.particles - 1));
  const speed = celebration.speed * (.84 + (index % 3) * .08);
  const vx = Math.cos(angle) * speed * celebration.horizontalSpread, vy = Math.sin(angle) * speed;
  const spin = (index % 2 ? 1 : -1) * (180 + index * 23);
  return Array.from({ length: 61 }, (_, step) => {
    const progress = step / 60, t = progress * celebration.duration / 1000;
    const travel = (1 - Math.exp(-celebration.drag * t)) / celebration.drag;
    const x = vx * travel;
    const y = vy * travel + celebration.gravity / celebration.drag * (t - travel);
    const opacity = progress <= celebration.fadeStart ? 1 : (1 - progress) / (1 - celebration.fadeStart);
    return { offset: progress, opacity, transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${spin * t}deg) scaleX(${Math.cos(t * (7 + index % 4))})` };
  });
}

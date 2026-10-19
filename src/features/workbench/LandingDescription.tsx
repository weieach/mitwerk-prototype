import { useEffect, useState } from 'react';

const DESCRIPTION_LINES = ['Visualization tool for AI-assisted', 'creative process'] as const;
export const LANDING_DESCRIPTION = DESCRIPTION_LINES.join(' ');
export const LANDING_TYPING = { startDelay: 350, letter: 14, letterVariation: 8, space: 65, edgeSlowdown: 2.4 } as const;

export function LandingDescription({ visible }: { visible:boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setCount(LANDING_DESCRIPTION.length); return; }
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      index += 1;
      setCount(index);
      if (index < LANDING_DESCRIPTION.length) {
        // Slow at both ends, with a brisk middle and longer word-boundary pauses.
        const edge = Math.cos(Math.PI * index / (LANDING_DESCRIPTION.length - 1)) ** 4;
        const base = LANDING_DESCRIPTION[index] === ' ' ? LANDING_TYPING.space : LANDING_TYPING.letter + (index * 7 % LANDING_TYPING.letterVariation);
        const delay = base * (1 + LANDING_TYPING.edgeSlowdown * edge);
        timer = setTimeout(next, delay);
      }
    };
    timer = setTimeout(next, LANDING_TYPING.startDelay);
    return () => clearTimeout(timer);
  }, [visible]);
  return <p className="landing-description" data-typing-complete={count === LANDING_DESCRIPTION.length}>
    {visible && <span className="sr-only">{LANDING_DESCRIPTION}</span>}
    <span aria-hidden="true">
      {DESCRIPTION_LINES.map((line, index) => <span className="landing-description-line" key={line}>
        <span className="landing-description-reserve">{line}</span>
        <span className="landing-description-typed">{line.slice(0, Math.max(0, count - (index ? DESCRIPTION_LINES[0].length + 1 : 0)))}</span>
      </span>)}
    </span>
  </p>;
}

import { useEffect, useRef, useState } from 'react';
import { printStops, printWordMs } from './print-text';

/**
 * Prints a reply word by word, keeping the conversation pinned to its end while it grows.
 * Screen readers get the full text at once; `onDone` fires after the last word.
 */
export function PrintedText({ text, onDone }: { text: string; onDone: () => void }) {
  const stops = useRef(printStops(text)).current;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduced ? stops.length : 0);
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (shown >= stops.length) { done.current(); return; }
    const timer = window.setTimeout(() => setShown(count => count + 1), printWordMs);
    return () => window.clearTimeout(timer);
  }, [shown, stops.length]);
  useEffect(() => {
    const scroller = root.current?.closest<HTMLElement>('.conversation-scroll');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [shown]);
  const visible = text.slice(0, stops[shown - 1] ?? 0);
  return <div ref={root} className="printed-text">
    <span className="sr-only">{text}</span>
    <div aria-hidden="true">{visible.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
  </div>;
}

import { useLayoutEffect, useRef, useState } from 'react';

const tipGap = 8;
const viewportGap = 8;

/**
 * The prompt or push message under a Playback frame. It is clamped to `--theater-summary-lines` with an ellipsis;
 * when the text is cut short, hovering or focusing it shows the full text in a top-layer tooltip.
 */
export function TheaterCaption({ text }: { text: string }) {
  const caption = useRef<HTMLParagraphElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useLayoutEffect(() => {
    const element = caption.current;
    if (!element) return;
    const measure = () => setTruncated(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);
  function show() {
    const element = caption.current, popup = tip.current;
    if (!truncated || !element || !popup) return;
    if (!popup.matches(':popover-open')) popup.showPopover();
    const bounds = element.getBoundingClientRect();
    popup.style.maxWidth = `${Math.min(bounds.width, innerWidth - viewportGap * 2)}px`;
    popup.style.left = `${Math.max(viewportGap, Math.min(bounds.left, innerWidth - viewportGap - popup.offsetWidth))}px`;
    const above = bounds.top - tipGap - popup.offsetHeight;
    popup.style.top = `${above >= viewportGap ? above : bounds.bottom + tipGap}px`;
  }
  function hide() { if (tip.current?.matches(':popover-open')) tip.current.hidePopover(); }
  return <>
    <p ref={caption} className={`theater-summary${truncated ? ' is-truncated' : ''}`} tabIndex={truncated ? 0 : undefined}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <span data-orbit-blocked data-orbit-inline>{text}</span>
    </p>
    <span ref={tip} popover="manual" role="tooltip" className="theater-summary-tip">{text}</span>
  </>;
}

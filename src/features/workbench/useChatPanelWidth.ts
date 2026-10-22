import { defaultChatWidth, workspaceResponsive } from './workspace-responsive';
import { useLayoutEffect, useRef, useState, type RefObject, type PointerEvent, type KeyboardEvent } from 'react';

export const chatPanelSizing = { initial: 500, min: 320, maxFraction: .55, keyStep: 24 } as const;

export function useChatPanelWidth(body: RefObject<HTMLDivElement | null>, viewportWidth: number) {
  const [preferred, setPreferred] = useState<number | null>(null);
  const [available, setAvailable] = useState(window.innerWidth);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ id: number; x: number; width: number } | null>(null);
  // While dragging, the width goes straight to the CSS variable once per frame; React state (and the whole
  // workspace re-render) only follows on release. `live` keeps any mid-drag render on the current width.
  const live = useRef<number | null>(null);
  const frame = useRef(0);
  const max = Math.min(viewportWidth * workspaceResponsive.chatPanelMaxFraction, Math.floor(available * chatPanelSizing.maxFraction));
  const min = Math.min(chatPanelSizing.min, max);
  const clamp = (value: number) => Math.max(min, Math.min(max, value));
  const width = clamp(live.current ?? preferred ?? defaultChatWidth(viewportWidth));
  useLayoutEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () => {
      const css = getComputedStyle(element);
      setAvailable(element.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, [body]);
  const stop = () => {
    cancelAnimationFrame(frame.current);
    if (live.current !== null) setPreferred(live.current);
    live.current = null; drag.current = null; setResizing(false);
  };
  function applyLive(next: number, separator: HTMLElement) {
    live.current = next;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      body.current?.style.setProperty('--chat-panel-width', `${next}px`);
      separator.setAttribute('aria-valuenow', String(Math.round(next)));
    });
  }
  return { width, min, max, resizing, separator: {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0) return;
      event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, width }; setResizing(true);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (drag.current?.id === event.pointerId) applyLive(clamp(drag.current.width + event.clientX - drag.current.x), event.currentTarget);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      stop();
    },
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      const next = event.key === 'ArrowLeft' ? width - chatPanelSizing.keyStep : event.key === 'ArrowRight' ? width + chatPanelSizing.keyStep : event.key === 'Home' ? min : event.key === 'End' ? max : null;
      if (next === null) return;
      event.preventDefault(); setPreferred(clamp(next));
    },
  } };
}

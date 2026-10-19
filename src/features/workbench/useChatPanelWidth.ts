import { defaultChatWidth, workspaceResponsive } from './workspace-responsive';
import { useLayoutEffect, useRef, useState, type RefObject, type PointerEvent, type KeyboardEvent } from 'react';

export const chatPanelSizing = { initial: 500, min: 320, max: 760, maxFraction: .55, keyStep: 24 } as const;

export function useChatPanelWidth(body: RefObject<HTMLDivElement | null>, viewportWidth: number) {
  const [preferred, setPreferred] = useState<number | null>(null);
  const [available, setAvailable] = useState(window.innerWidth);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ id: number; x: number; width: number } | null>(null);
  const max = Math.min(chatPanelSizing.max * Math.max(1, viewportWidth / workspaceResponsive.desktopWidth), Math.floor(available * chatPanelSizing.maxFraction));
  const min = Math.min(chatPanelSizing.min, max);
  const clamp = (value: number) => Math.max(min, Math.min(max, value));
  const width = clamp(preferred ?? defaultChatWidth(viewportWidth));
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
  const stop = () => { drag.current = null; setResizing(false); };
  return { width, min, max, resizing, separator: {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0) return;
      event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, width }; setResizing(true);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (drag.current?.id === event.pointerId) setPreferred(clamp(drag.current.width + event.clientX - drag.current.x));
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

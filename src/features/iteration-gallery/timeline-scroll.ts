import { timelineWheelDelta } from './timeline.ts';

/** Native non-passive listeners keep wheel and middle-button panning independent of scrubbing. */
export function bindTimelineScrolling(element: HTMLElement, onPan: () => void) {
  let drag: { id: number; x: number; left: number } | null = null;
  function wheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey || element.scrollWidth <= element.clientWidth) return;
    event.preventDefault(); onPan();
    element.scrollLeft += timelineWheelDelta(event.deltaX, event.deltaY, event.deltaMode, element.clientWidth);
  }
  function down(event: PointerEvent) {
    if (event.button !== 1) return;
    event.preventDefault(); event.stopPropagation();
    drag = { id: event.pointerId, x: event.clientX, left: element.scrollLeft };
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-panning'); onPan();
  }
  function move(event: PointerEvent) {
    if (drag?.id !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    element.scrollLeft = drag.left + drag.x - event.clientX;
  }
  function end(event: PointerEvent) {
    if (drag?.id !== event.pointerId) return;
    drag = null; element.classList.remove('is-panning');
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  }
  const aux = (event: MouseEvent) => { if (event.button === 1) event.preventDefault(); };
  element.addEventListener('wheel', wheel, { passive: false });
  element.addEventListener('pointerdown', down, true);
  element.addEventListener('pointermove', move, true);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
  element.addEventListener('lostpointercapture', end);
  element.addEventListener('auxclick', aux);
  return () => {
    element.removeEventListener('wheel', wheel); element.removeEventListener('pointerdown', down, true);
    element.removeEventListener('pointermove', move, true); element.removeEventListener('pointerup', end);
    element.removeEventListener('pointercancel', end); element.removeEventListener('lostpointercapture', end);
    element.removeEventListener('auxclick', aux);
    if (drag && element.hasPointerCapture(drag.id)) element.releasePointerCapture(drag.id);
    drag = null; element.classList.remove('is-panning');
  };
}

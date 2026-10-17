import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTimelineScrolling } from '../src/features/iteration-gallery/timeline-scroll.ts';

class Viewport extends EventTarget {
  scrollLeft = 100; scrollWidth = 1000; clientWidth = 400;
  captured = new Set<number>();
  classes = new Set<string>();
  classList = { add: (v: string) => this.classes.add(v), remove: (v: string) => this.classes.delete(v) };
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  emit(type: string, props: Record<string, number | boolean>) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, props); this.dispatchEvent(event); return event;
  }
}

test('middle-button dragging pans without consuming left-button scrubbing and ends on cancellation', () => {
  const view = new Viewport(); let cleared = 0;
  const cleanup = bindTimelineScrolling(view as unknown as HTMLElement, () => cleared++);
  assert.equal(view.emit('pointerdown', { button: 0, pointerId: 1, clientX: 200 }).defaultPrevented, false);
  view.emit('pointermove', { pointerId: 1, clientX: 100 }); assert.equal(view.scrollLeft, 100);
  assert.equal(view.emit('pointerdown', { button: 1, pointerId: 2, clientX: 200 }).defaultPrevented, true);
  view.emit('pointermove', { pointerId: 2, clientX: 120 }); assert.equal(view.scrollLeft, 180);
  assert.equal(view.classes.has('is-panning'), true); assert.equal(cleared, 1);
  view.emit('pointercancel', { pointerId: 2 }); assert.equal(view.captured.size, 0);
  view.emit('pointermove', { pointerId: 2, clientX: 20 }); assert.equal(view.scrollLeft, 180);
  assert.equal(view.classes.has('is-panning'), false);
  cleanup();
});

test('wheel panning clears previews, respects zoom modifiers, and removes listeners on cleanup', () => {
  const view = new Viewport(); let cleared = 0;
  const cleanup = bindTimelineScrolling(view as unknown as HTMLElement, () => cleared++);
  view.emit('wheel', { deltaX: 0, deltaY: 80, deltaMode: 0 }); assert.equal(view.scrollLeft, 180);
  assert.equal(cleared, 1);
  assert.equal(view.emit('wheel', { deltaX: 0, deltaY: 80, deltaMode: 0, ctrlKey: true }).defaultPrevented, false);
  assert.equal(view.scrollLeft, 180);
  cleanup(); view.emit('wheel', { deltaX: 0, deltaY: 80, deltaMode: 0 }); assert.equal(view.scrollLeft, 180);
});

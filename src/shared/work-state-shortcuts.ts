import { workStateStore, workStateTokens } from './work-state.ts';

/** Shortcuts belong to an explicitly opened simulator session, including its hidden sheet. */
export function bindWorkStateShortcuts(host: Window) {
  const held = new Set<string>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastZero: number | null = null;
  function stop() {
    held.clear(); clearInterval(timer); timer = undefined;
    lastZero = null; workStateStore.commit();
  }
  function advance() {
    const state = workStateStore.get();
    if (!state.open) { stop(); return; }
    if (state.loading) return;
    const direction = Number(held.has(']')) - Number(held.has('['));
    if (direction) workStateStore.setProgress(state.progress + direction * workStateTokens.keyboardStep);
  }
  function keydown(event: KeyboardEvent) {
    const state = workStateStore.get();
    if (!state.open || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
    const key = event.key;
    if (!['-', '0', '[', ']'].includes(key) && !(key === 'Escape' && state.hidden)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return;
    if (key === '-') {
      workStateStore.hide();
      const focused = host.document.activeElement;
      if (focused instanceof HTMLElement && focused.closest('.work-state-simulator')) focused.blur();
    } else if (key === 'Escape') {
      stop(); workStateStore.show();
      host.requestAnimationFrame(() => {
        const current = workStateStore.get();
        if (current.open && !current.hidden) host.document.querySelector<HTMLElement>('.work-state-slider')?.focus({ preventScroll: true });
      });
    } else if (!state.loading && key === '0') {
      held.clear(); clearInterval(timer); timer = undefined;
      const now = performance.now();
      const double = lastZero !== null && now - lastZero <= workStateTokens.doubleZeroMs;
      lastZero = double ? null : now;
      workStateStore.setProgress(double ? 1 : 0); workStateStore.commit();
    } else if (!state.loading && (key === '[' || key === ']')) {
      lastZero = null; held.add(key); advance();
      timer ??= setInterval(advance, workStateTokens.keyboardRepeatMs);
    }
  }
  function keyup(event: KeyboardEvent) {
    const key = event.code === 'BracketLeft' ? '[' : event.code === 'BracketRight' ? ']' : event.key;
    if (!held.delete(key)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!held.size) { clearInterval(timer); timer = undefined; workStateStore.commit(); }
  }
  function visibility() { if (host.document.hidden) stop(); }
  const unsubscribe = workStateStore.subscribe(() => {
    if (!workStateStore.get().open && (held.size || lastZero !== null)) stop();
  });
  host.addEventListener('keydown', keydown, true);
  host.addEventListener('keyup', keyup, true);
  host.addEventListener('blur', stop);
  host.document.addEventListener('visibilitychange', visibility);
  return () => {
    host.removeEventListener('keydown', keydown, true);
    host.removeEventListener('keyup', keyup, true);
    host.removeEventListener('blur', stop);
    host.document.removeEventListener('visibilitychange', visibility);
    unsubscribe(); stop();
  };
}

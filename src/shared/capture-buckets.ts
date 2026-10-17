import { captureScreens } from './capture-screens.ts';
export function durableCaptureScreen(value: string) {
  return captureScreens.some(screen => screen.value === value) ? value : captureScreens[0].value;
}
/** UI-created buckets live only in this document; creating one never writes a frame. */
export function createCaptureBucketStore() {
  let options: readonly { value: string; label: string }[] = [...captureScreens];
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => options,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    add(text: string) {
      const value = text.trim();
      if (!value) return null;
      const existing = options.find(option => option.value.toLowerCase() === value.toLowerCase());
      if (existing) return existing.value;
      options = [...options, { value, label: value }];
      listeners.forEach(listener => listener());
      return value;
    },
  };
}
export const captureBucketStore = createCaptureBucketStore();

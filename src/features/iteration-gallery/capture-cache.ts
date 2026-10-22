import { buildVersions, representativeFrames, versionsForScreen, type Capture } from './model';
import { simulateCaptures } from '../../shared/work-state';

/** Decoded captures survive gallery remounts; filenames are immutable, so URLs key them safely. */
export const prefetchedCaptures = new Map<string, HTMLImageElement>();
const inflight = new Map<string, Promise<void>>();

/** Album planes and their warm-up use the small thumbnail; opened frames load `frame.url`. */
export function captureUrl(frame: Pick<Capture, 'url' | 'thumbUrl'>) { return `${import.meta.env.BASE_URL}${frame.thumbUrl ?? frame.url}`; }

function warm(url: string) {
  if (prefetchedCaptures.has(url)) return Promise.resolve();
  let pending = inflight.get(url);
  if (!pending) {
    const image = new Image();
    image.src = url;
    pending = image.decode().then(() => { prefetchedCaptures.set(url, image); }, () => {}).finally(() => inflight.delete(url));
    inflight.set(url, pending);
  }
  return pending;
}

/** Decodes captures into the shared cache a few at a time, reporting how many have settled. */
export async function warmCaptures(urls: string[], onProgress?: (done: number, total: number) => void, concurrency = 6) {
  const queue = [...new Set(urls)];
  const total = queue.length;
  let done = 0;
  onProgress?.(0, total);
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (queue.length) { await warm(queue.shift()!); onProgress?.(++done, total); }
  }));
}

/** The frames Version blocks paints at a capture count: the album's sampled frames for one screen. */
export function simulatedGalleryUrls(captures: Capture[], count: number, screen: string) {
  const versions = versionsForScreen(buildVersions(simulateCaptures(captures, count).captures), screen);
  return representativeFrames(versions, 'all', Date.now(), 'start').map(captureUrl);
}

/** Images to warm when the simulator opens: sampled frames at evenly spaced work states, newest first. */
export function simulatorPreloadUrls(captures: Capture[], screen: string, samples: number, limit: number) {
  const urls = new Set<string>();
  for (let i = samples; i >= 1 && urls.size < limit; i--) {
    for (const url of simulatedGalleryUrls(captures, Math.round(captures.length * i / samples), screen)) urls.add(url);
  }
  return [...urls].slice(0, limit);
}

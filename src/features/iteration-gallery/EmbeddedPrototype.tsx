import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatVersion } from './model';
import { galleryTokens as t } from './tokens';

export type RuntimeMode = 'prototype' | 'live';

/** Interactive content replaces the saved image in its existing frame. */
export function EmbeddedPrototype({ mode, url, loading, error, version, onRetry }: {
  mode: RuntimeMode; url: string | null; loading: boolean; error: string | null; version: number;
  onRetry: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const root = useRef<HTMLElement>(null);
  // Lay the app out at a desktop width, then scale the whole viewport down to the frame.
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const fit = () => setScale(Math.min(1, node.clientWidth / t.theater.runtimeViewportWidth) || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const [liveUrl] = useState(() => {
    const target = new URL(import.meta.env.BASE_URL, location.origin);
    target.searchParams.set('livePreview', '1');
    target.searchParams.set('theme', document.documentElement.dataset.theme ?? 'dark');
    return target.href;
  });
  const source = mode === 'live' ? liveUrl : url;
  const failure = mode === 'prototype' ? error : null;
  return <section ref={root} className="theater-runtime" style={{ '--runtime-scale': scale } as CSSProperties} aria-label={mode === 'live' ? 'Live server preview' : 'Embedded prototype'} data-runtime-ready={loaded} data-orbit-blocked>
    {source && !failure && <iframe className="theater-prototype" src={source}
      title={mode === 'live' ? 'Live server prototype' : `${formatVersion(version)} interactive archived prototype`}
      sandbox={mode === 'live' ? 'allow-scripts allow-same-origin' : 'allow-scripts'} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)}/>}
    {failure ? <div className="runtime-status" role="alert"><p>{failure}</p><button onClick={onRetry}>Retry</button></div>
      : (!loaded || loading) && <div className="runtime-status" role="status">{mode === 'live' ? 'Starting live server…' : 'Building prototype…'}</div>}
  </section>;
}

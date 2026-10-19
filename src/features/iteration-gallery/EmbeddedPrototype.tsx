import { livePreviewRefreshEvent } from '../../shared/demo-events';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { runtimeKeyMessage } from '../../shared/runtime-messages.mjs';
import { formatVersion } from './model';
import { galleryTokens as t } from './tokens';

export type RuntimeMode = 'prototype' | 'live';

/** Interactive content replaces the saved image in its existing frame. */
export function EmbeddedPrototype({ mode, url, loading, error, version, onRetry, ref }: {
  mode: RuntimeMode; url: string | null; loading: boolean; error: string | null; version: number;
  onRetry: () => void; ref?: Ref<HTMLElement>;
}) {
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (mode !== 'live') return;
    const refresh = () => { setLoaded(false); setRevision(value => value + 1); };
    window.addEventListener(livePreviewRefreshEvent, refresh);
    return () => window.removeEventListener(livePreviewRefreshEvent, refresh);
  }, [mode]);
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const setRoot = (node: HTMLElement | null) => {
    root.current = node;
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  };
  // Full screen: show how to leave it; Tab / Escape pressed inside the runtime (forwarded by its page) or here exit.
  const [fullscreenHint, setFullscreenHint] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const exit = () => { if (root.current && document.fullscreenElement === root.current) void document.exitFullscreen(); };
    const change = () => {
      clearTimeout(timer);
      const active = !!root.current && document.fullscreenElement === root.current;
      setFullscreenHint(active);
      if (active) timer = setTimeout(() => setFullscreenHint(false), t.theater.fullscreenHintMs);
    };
    const message = (event: MessageEvent) => { if (event.source === frame.current?.contentWindow && event.data?.type === runtimeKeyMessage) exit(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Tab') exit(); };
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('message', message);
    document.addEventListener('keydown', key, true);
    return () => { clearTimeout(timer); document.removeEventListener('fullscreenchange', change); window.removeEventListener('message', message); document.removeEventListener('keydown', key, true); };
  }, []);
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
  const source = mode === 'live' ? `${liveUrl}${revision ? `&refresh=${revision}` : ''}` : url;
  const failure = mode === 'prototype' ? error : null;
  return <section ref={setRoot} className="theater-runtime" style={{ '--runtime-scale': scale } as CSSProperties} aria-label={mode === 'live' ? 'Live server preview' : 'Embedded prototype'} data-runtime-ready={loaded} data-orbit-blocked>
    {source && !failure && <iframe ref={frame} className="theater-prototype" src={source}
      title={mode === 'live' ? 'Live server prototype' : `${formatVersion(version)} interactive archived prototype`}
      sandbox={mode === 'live' ? 'allow-scripts allow-same-origin' : 'allow-scripts'} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)}/>}
    {failure ? <div className="runtime-status" role="alert"><p>{failure}</p><button onClick={onRetry}>Retry</button></div>
      : (!loaded || loading) && <div className="runtime-status" role="status">{mode === 'live' ? 'Starting live server…' : 'Building prototype…'}</div>}
    {fullscreenHint && <div className="runtime-fullscreen-hint" role="status">Press Esc or Tab to exit full screen</div>}
  </section>;
}

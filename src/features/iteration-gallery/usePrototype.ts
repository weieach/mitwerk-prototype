import { useEffect, useRef, useState } from 'react';
import { galleryTokens as t } from './tokens';
import type { GalleryFrame } from './model';

type PrototypeState = { available: boolean | null; loading: boolean; url: string | null; error: string | null };
const empty: PrototypeState = { available: null, loading: false, url: null, error: null };

/** Availability is folder-driven; build only after the explicit Enter prototype action. */
export function usePrototype(frame: GalleryFrame | undefined, active: boolean) {
  const number = frame?.kind === 'push' ? frame.number : null;
  const [state, setState] = useState<PrototypeState>(empty);
  const [open, setOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    setState(empty); setOpen(false);
    const abort = new AbortController();
    if (number !== null) void fetch(`/__mitwerk/prototypes/${number}`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('Prototype service unavailable'); return response.json(); })
      .then(result => { if (!abort.signal.aborted) setState({ ...empty, available: result.available === true }); })
      .catch(() => { if (!abort.signal.aborted) setState({ ...empty, available: false }); });
    return () => { abort.abort(); request.current?.abort(); request.current = null; };
  }, [number]);
  useEffect(() => { if (!active) setOpen(false); }, [active]);
  async function enter() {
    if (number === null || !active || !state.available || state.loading) return;
    if (state.url) { setOpen(true); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const signal = controller.signal;
    const timeout = window.setTimeout(() => controller.abort(new Error('Prototype build timed out. Please try again.')), t.theater.prototypeTimeoutMs);
    setState(value => ({ ...value, loading: true, error: null }));
    try {
      const response = await fetch(`/__mitwerk/prototypes/${number}`, { method: 'POST', signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'The prototype could not be built.');
      if (signal.aborted || request.current !== controller) return;
      setState(value => ({ ...value, loading: false, url: result.url })); setOpen(true);
    } catch (error) {
      if (request.current === controller) setState(value => ({ ...value, loading: false, error: signal.aborted ? 'Prototype build timed out. Please try again.' : error instanceof Error ? error.message : 'Unable to open prototype.' }));
    } finally { window.clearTimeout(timeout); }
  }
  const exit = () => { request.current?.abort(); request.current = null; setOpen(false); setState(value => ({ ...value, loading: false })); };
  return { ...state, open: open && active, enter, exit };
}

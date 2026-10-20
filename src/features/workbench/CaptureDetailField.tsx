import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { captureDetailTokens, inferCaptureDetails } from './capture-details';

/** Infer capture details after the message settles, retaining manual inline editing. */
export function CaptureDetailField({ value, message, onChange }: { value: string; message: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  const [loading, setLoading] = useState(Boolean(message.trim()));
  const commit = useRef(onChange);
  commit.current = onChange;
  useLayoutEffect(() => {
    if (!message.trim()) {
      setLoading(false); setDraft(''); commit.current('');
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const details = inferCaptureDetails(message);
      setDraft(details); commit.current(details); setLoading(false);
    }, captureDetailTokens.idleMs);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => setDraft(value), [value]);
  return <span className="capture-detail-control" data-loading={loading}>
    <input className="capture-detail-field" aria-label="Capture details" aria-busy={loading} readOnly={loading} tabIndex={loading ? -1 : undefined} placeholder={captureDetailTokens.placeholder} value={draft} size={1}
    onFocus={() => { cancelled.current = false; }}
    onChange={event => setDraft(event.target.value)}
    onBlur={() => {
      if (cancelled.current || loading) return;
      const next = draft.trim();
      if (next !== value) onChange(next);
      setDraft(next);
    }}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); cancelled.current = true;
        setDraft(value); event.currentTarget.blur();
      }
    }}/>
    <span className="capture-detail-status" role="status" aria-live="polite">
      <span className="sr-only">{loading ? 'Detecting capture details' : draft ? `Capture details: ${draft}` : ''}</span>
      {loading && <span className="capture-detail-dots" aria-hidden="true"><i/><i/><i/></span>}
    </span>
  </span>;
}

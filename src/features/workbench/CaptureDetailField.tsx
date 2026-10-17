import { useEffect, useRef, useState } from 'react';

/** Free-text capture detail, following the design-system branch's inline field. */
export function CaptureDetailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  useEffect(() => setDraft(value), [value]);
  return <input className="capture-detail-field" aria-label="Capture details" placeholder="details" value={draft} size={1}
    onFocus={() => { cancelled.current = false; }}
    onChange={event => setDraft(event.target.value)}
    onBlur={() => {
      if (cancelled.current) return;
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
    }}/>;
}

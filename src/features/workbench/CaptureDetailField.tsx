import { useEffect, useState } from 'react';

/** Free-text capture detail ("Capturing [bucket] with ___"). Not a category, so it is a frameless field sized to its text, not a chip. */
export function CaptureDetailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { const next = draft.trim(); if (next !== value) onChange(next); setDraft(next); };
  return <input className="capture-detail-field" aria-label="Capture details" placeholder="details" value={draft} size={1}
    onChange={event => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDraft(value); requestAnimationFrame(() => (event.target as HTMLInputElement).blur()); }
    }}/>;
}

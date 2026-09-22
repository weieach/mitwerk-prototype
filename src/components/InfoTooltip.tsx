import { useId, useState } from 'react';
import { Icon } from './Icon';
import './info-tooltip.css';

export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className="info-tooltip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className="icon-button" aria-label={label} aria-describedby={open ? id : undefined}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}><Icon name="info"/></button>
    {open && <span id={id} role="tooltip" className="info-tooltip-content">{children}</span>}
  </span>;
}

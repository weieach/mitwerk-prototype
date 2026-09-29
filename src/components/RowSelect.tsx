import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Option = { value: string; label: string; detail?: string };
/** Native keyboard/menu behavior with a full-width, space-between presentation. */
export function RowSelect({ label, value, options, onChange, leading, disabled = false }: {
  label: string; value: string; options: readonly Option[]; onChange: (value: string) => void;
  leading?: ReactNode; disabled?: boolean;
}) {
  const selected = options.find(option => option.value === value);
  return <span className="row-select" data-header-fill data-header-fill-content>
    <span className="row-select-value header-fill-label" aria-hidden="true">
      {leading}<span className="row-select-copy">{selected?.label}{selected?.detail && <span className="row-select-detail"> · {selected.detail}</span>}</span>
    </span>
    <Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }}/>
    <select aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}{option.detail ? ` · ${option.detail}` : ''}</option>)}
    </select>
  </span>;
}

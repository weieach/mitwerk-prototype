import { useId } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { SelectMenu, useSelectMenu } from './SelectMenu';

type Option = { value: string; label: string; detail?: string };
/** Full-width, space-between selector that opens the shared designed menu rather than the OS picker. */
export function RowSelect({ label, value, options, onChange, leading, disabled = false, align = 'start' }: {
  label: string; value: string; options: readonly Option[]; onChange: (value: string) => void;
  leading?: ReactNode; disabled?: boolean; align?: 'start' | 'center';
}) {
  const id = useId();
  const menu = useSelectMenu<HTMLButtonElement>(onChange);
  const selected = options.find(option => option.value === value);
  return <>
    <button type="button" {...menu.triggerProps} className={`row-select${value === '' ? ' is-placeholder' : ''}${align === 'center' ? ' is-centered' : ''}`} data-header-fill data-header-fill-content
      aria-label={label} aria-controls={menu.open ? id : undefined} disabled={disabled}>
      <span className="row-select-value header-fill-label">
        {leading}<span className="row-select-copy">{selected?.label}{selected?.detail && <span className="row-select-detail"> · {selected.detail}</span>}</span>
      </span>
      <Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }}/>
    </button>
    {menu.open && <SelectMenu id={id} label={label} anchor={menu.trigger} options={options} value={value} align={align} onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </>;
}

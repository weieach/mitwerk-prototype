import { useId, useMemo } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import { formatFrameLabel, type GalleryFrame } from './model';

/** A rich listbox keeps annotation indicators aligned independently of label length. */
export function SavedFrameSelect({ frames, counts, value, onChange }: {
  frames: GalleryFrame[]; counts: ReadonlyMap<string, number>; value: string; onChange: (id: string) => void;
}) {
  const options = useMemo(() => [...frames].sort((a, b) => b.timestamp - a.timestamp || (b.number ?? 0) - (a.number ?? 0)).map(frame => ({
    value: frame.id, label: formatFrameLabel(frame),
    ariaLabel: `${formatFrameLabel(frame)}${counts.has(frame.id) ? `, ${counts.get(frame.id)} annotations` : ''}`,
    trailing: counts.has(frame.id) ? <PhosphorIcon name="bookmark-simple" weight="fill"/> : undefined,
  })), [frames, counts]);
  const id = useId();
  const menu = useSelectMenu<HTMLButtonElement>(onChange);
  const selected = frames.find(frame => frame.id === value);
  return <>
    <button type="button" {...menu.triggerProps} className={`row-select saved-frame-trigger${value ? '' : ' is-placeholder'}`} data-header-fill data-header-fill-content
      aria-label="Saved frame" aria-controls={menu.open ? id : undefined} disabled={!frames.length}>
      <span className="row-select-copy">{selected ? formatFrameLabel(selected) : frames.length ? 'Select frame' : 'No frames in range'}</span>
      <PhosphorIcon name="caret-down" size="var(--selector-caret-size)"/>
    </button>
    {/* Sized to its longest label, right-aligned under the trigger at the panel's edge. */}
    {menu.open && <SelectMenu id={id} label="Saved frames, newest first" anchor={menu.trigger} options={options} value={value}
      align="end" onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </>;
}

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { SelectMenu, useSelectMenu, type SelectMenuOption } from '../../components/SelectMenu';
import type { LoopMode } from './model';
import { jumpScales, type JumpScale } from './timeline';
import { galleryTokens as t } from './tokens';

export const loopModes: { value: LoopMode; label: string }[] = [{ value: 'once', label: 'No loop' }, { value: 'loop', label: 'Loop' }, { value: 'ping-pong', label: 'Ping-pong' }];

const unitOptionLabels: Record<JumpScale, string> = { frame: 'Prompt', version: 'Version', milestone: 'Milestone' };

const playUnitLabels: Record<JumpScale, string> = { frame: 'per prompt', version: 'per version', milestone: 'per milestone' };

/** One "Controls" menu for the playback unit, speed and looping; each section keeps its own choice. */
export function PlaybackControls({ unit, speed, loop, onUnit, onSpeed, onLoop }: {
  unit: JumpScale; speed: number; loop: LoopMode;
  onUnit: (unit: JumpScale) => void; onSpeed: (speed: number) => void; onLoop: (loop: LoopMode) => void;
}) {
  const id = useId();
  // Choices apply in place; the menu stays open until a click outside (or Escape) closes it.
  const apply = (value: string) => {
    const [section, choice] = value.split(':');
    if (section === 'unit') onUnit(choice as JumpScale);
    else if (section === 'speed') onSpeed(Number(choice));
    else onLoop(choice as LoopMode);
  };
  const menu = useSelectMenu<HTMLButtonElement>(apply);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const panel = menu.trigger.current?.closest('.theater-view');
    if (!panel) return;
    const measure = () => setWide(panel.clientWidth >= t.controls.menuRowsMinPanelWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(panel); measure();
    return () => observer.disconnect();
  }, []);
  const captureOpened = useRef(false);
  useEffect(() => { const params = new URLSearchParams(location.search); if (!captureOpened.current && params.get('screenshot') === '1' && params.get('controlsOpen') === '1') { captureOpened.current = true; menu.trigger.current?.click(); } }, []);
  // The current choice in each column is marked by Version blocks blue text (see `.playback-controls-menu`).
  const options: SelectMenuOption[] = [
    ...t.speeds.map(value => ({ value: `speed:${value}`, label: `${value}×`, group: 'Speed', selected: speed === value })),
    ...loopModes.map(option => ({ value: `loop:${option.value}`, label: option.label, group: 'Loop', selected: loop === option.value })),
    ...jumpScales.map(option => ({ value: `unit:${option.value}`, label: unitOptionLabels[option.value], group: 'Play per...', selected: unit === option.value })),
  ];
  return <>
    <button type="button" {...menu.triggerProps} className="row-select playback-controls-trigger" aria-label="Playback controls" aria-controls={menu.open ? id : undefined}>
      <span className="row-select-value"><span className="row-select-copy">Controls<span className="playback-controls-summary">{'\u00a0\u00a0\u00a0'}{speed}×, {loopModes.find(option => option.value === loop)?.label.toLowerCase()}, {playUnitLabels[unit]}</span></span></span>
      <Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }}/>
    </button>
    {menu.open && <SelectMenu id={id} label="Playback controls" anchor={menu.trigger} options={options} value="" align="end" columns={!wide} rows={wide} gap={t.controls.gap}
      onChoose={apply} onDismiss={menu.dismiss} className="playback-controls-menu"/>}
  </>;
}

type Mode = 'Gallery' | 'Playback';

/** How Version blocks shows its frames: Gallery is the 3D album of every version, Playback steps through frames like a timelapse. Both options stay visible; the active one reads as the current view. */
export function PanelViewSwitch({ mode, disabled, onChange, action }: { mode: Mode; disabled: boolean; onChange?: (mode: Mode) => void; action?: { label: string; onClick: () => void } }) {
  const options: [Mode, string][] = [['Gallery', '3D album of every version'], ['Playback', 'Step through frames as a timelapse']];
  return <div className="panel-view-switch" role="group" aria-label="Version blocks view">
    {options.map(([value, hint]) => <button key={value} type="button" className="panel-view-option" aria-pressed={mode === value} disabled={disabled || (!!action && value !== 'Playback')} aria-label={action && value === 'Playback' ? action.label : undefined} title={hint} onClick={() => { if (action) { action.onClick(); return; } if (mode !== value) onChange?.(value); }}>{value}</button>)}
  </div>;
}

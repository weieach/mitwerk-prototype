import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { roleEdit, typeColors, typeOverrideCss, typeRoleGroups, typeRoles, typeStudio, typeWeights, type TypeRole } from '../../shared/type-studio';
import './type-studio.css';

function useTypeStudio() {
  return useSyncExternalStore(typeStudio.subscribe, typeStudio.get, typeStudio.get);
}

function SizeControl({ role }: { role: TypeRole }) {
  const edit = roleEdit(useTypeStudio().overrides, role.id);
  const value = edit.size ?? role.defaults.sizePx;
  return <label className="type-field">
    <span>Size <b>{edit.size != null ? `${edit.size}px` : role.defaults.fluid ? 'Fluid' : `${role.defaults.sizePx}px`}</b></span>
    <input type="range" min={8} max={40} step={0.5} value={value} aria-label={`${role.label} size`} onChange={event => typeStudio.update(role.id, { size: Number(event.target.value) })}/>
  </label>;
}

function RoleControls({ role }: { role: TypeRole }) {
  const edit = roleEdit(useTypeStudio().overrides, role.id);
  const colorValue = edit.color ?? (role.defaults.keepColor ? '' : role.defaults.color);
  const knownColor = typeColors.some(color => color.value === colorValue);
  const custom = colorValue.startsWith('#');
  return <div className="type-role-controls">
    <p className="type-where">{role.where}</p>
    <p className="type-sample" style={{
      fontFamily: edit.family === 'mono' ? 'var(--font-code)' : 'var(--sans)',
      fontSize: edit.size != null ? `${edit.size}px` : `${role.defaults.sizePx}px`,
      fontWeight: edit.weight ?? role.defaults.weight,
      fontStyle: (edit.italic ?? role.defaults.italic) ? 'italic' : 'normal',
      letterSpacing: edit.tracking != null ? `${edit.tracking}em` : role.defaults.tracking,
      lineHeight: edit.leading ?? role.defaults.leading,
      color: colorValue || 'var(--ink)',
    }}>{role.sample}</p>
    <SizeControl role={role}/>
    <label className="type-field">Weight
      <select aria-label={`${role.label} weight`} value={edit.weight ?? role.defaults.weight} onChange={event => typeStudio.update(role.id, { weight: Number(event.target.value) })}>
        {typeWeights.map(weight => <option key={weight} value={weight}>{weight}</option>)}
      </select>
    </label>
    <label className="type-field">
      <span>Line height <b>{edit.leading ?? role.defaults.leading}</b></span>
      <input type="range" min={0.9} max={2} step={0.05} value={edit.leading ?? role.defaults.leading} aria-label={`${role.label} line height`} onChange={event => typeStudio.update(role.id, { leading: Number(event.target.value) })}/>
    </label>
    <label className="type-field">
      <span>Letter spacing <b>{edit.tracking ?? role.defaults.trackingEm}em</b></span>
      <input type="range" min={-0.06} max={0.2} step={0.005} value={edit.tracking ?? role.defaults.trackingEm} aria-label={`${role.label} letter spacing`} onChange={event => typeStudio.update(role.id, { tracking: Number(event.target.value) })}/>
    </label>
    <label className="type-field">Color
      <select aria-label={`${role.label} color`} value={knownColor || colorValue === '' ? colorValue : 'custom'} onChange={event => {
        if (event.target.value === '') typeStudio.clearField(role.id, 'color');
        else if (event.target.value === 'custom') typeStudio.update(role.id, { color: '#fafafa' });
        else typeStudio.update(role.id, { color: event.target.value });
      }}>
        {role.defaults.keepColor && <option value="">Keep</option>}
        {typeColors.map(color => <option key={color.id} value={color.value}>{color.label}</option>)}
        <option value="custom">Custom</option>
      </select>
    </label>
    {custom && <label className="type-field">Custom color
      <input type="color" aria-label={`${role.label} custom color`} value={colorValue} onChange={event => typeStudio.update(role.id, { color: event.target.value })}/>
    </label>}
    <label className="type-field">Family
      <select aria-label={`${role.label} family`} value={edit.family ?? role.defaults.family} onChange={event => typeStudio.update(role.id, { family: event.target.value as 'sans' | 'mono' })}>
        <option value="sans">Waldenburg</option>
        <option value="mono">Mono</option>
      </select>
    </label>
    <label className="type-check"><input type="checkbox" checked={edit.italic ?? role.defaults.italic} onChange={event => typeStudio.update(role.id, { italic: event.target.checked })}/> Italic</label>
    <button type="button" className="type-text" onClick={() => typeStudio.resetRole(role.id)}>Reset {role.label}</button>
  </div>;
}

export function TypeStudio() {
  const state = useTypeStudio();
  const [copied, setCopied] = useState(false);
  if (typeof document === 'undefined' || new URLSearchParams(location.search).get('screenshot') === '1' || !state.open) return null;
  const changed = Object.keys(state.overrides).length;
  async function copyCss() {
    const css = typeOverrideCss(state.overrides) || '/* No type edits yet. */\n';
    try { await navigator.clipboard.writeText(css); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { /* The selection below still lets the values be copied. */ }
    const area = document.getElementById('type-studio-css');
    if (area instanceof HTMLTextAreaElement) { area.value = css; area.focus(); area.select(); }
  }
  return createPortal(<aside className="type-studio" aria-label="Type editor">
    <header>
      <strong>Type</strong>
      <span>{copied ? 'Copied' : changed ? `${changed} changed` : 'Defaults'}</span>
      <button type="button" onClick={copyCss}>Copy CSS</button>
      <button type="button" onClick={() => typeStudio.resetAll()} disabled={!changed}>Reset</button>
      <button type="button" onClick={() => typeStudio.close()} aria-label="Close type editor">Close</button>
    </header>
    <textarea id="type-studio-css" className="type-css" readOnly aria-label="Changed type CSS" value={typeOverrideCss(state.overrides)}/>
    <div className="type-roles">
      {typeRoleGroups.map(group => <section key={group}>
        <h2>{group}</h2>
        {typeRoles.filter(role => role.group === group).map(role => {
          const edited = state.overrides[role.id] != null;
          const expanded = state.focus === role.id;
          return <div key={role.id} className={expanded ? 'is-open' : ''}>
            <button type="button" className="type-role" aria-expanded={expanded} onClick={() => typeStudio.focusRole(role.id)}>
              <span>{role.label}</span>{edited && <i/>}
            </button>
            {expanded && <RoleControls role={role}/>}
          </div>;
        })}
      </section>)}
    </div>
  </aside>, document.body);
}

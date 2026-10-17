import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../shared/theme';
import { PhosphorIcon } from '../components/PhosphorIcon';
import './system-page.css';

/** Live reference for the tokens the product actually uses. Every value is read from the running stylesheet, so it never drifts from the app. */
const colorGroups: [string, [string, string][]][] = [
  ['Surfaces', [['--workspace-background', 'Behind panels'], ['--paper', 'Panel'], ['--fill', 'Control fill'], ['--user-message-fill', 'Own message'], ['--composer-drawer-surface', 'To-do section'], ['--composer-surface', 'Message box'], ['--capture-chip-surface', 'Bucket chip'], ['--capture-edit-surface', 'Chip editing']]],
  ['Text', [['--ink', 'Primary'], ['--muted', 'Secondary'], ['--faint', 'Tertiary'], ['--capture-detail-placeholder', 'Placeholder']]],
  ['Lines and strokes', [['--line', 'Hairline'], ['--line-strong', 'Divider'], ['--stroke-strong', 'Emphasis stroke'], ['--inline-field-line', 'Field underline'], ['--view-tag-bg', 'View tag']]],
  ['Branches', [['--contrast', 'Main branch']]],
];
const layoutTokens: [string, string][] = [
  ['--workspace-edge', 'Panel to screen edge'], ['--workspace-gutter', 'Panel to panel'], ['--workspace-radius', 'Panel corner'],
  ['--panel-heading-height', 'Panel title row'], ['--panel-title-inset', 'Title icon inset'], ['--panel-title-gap', 'Icon to title'],
  ['--panel-pill-inset', 'Title pill inset'], ['--panel-pill-radius', 'Title pill corner'], ['--composer-inset', 'Message box inset'],
  ['--composer-drawer-radius', 'To-do section corner'], ['--capture-chip-height', 'Bucket chip height'],
];
const motionTokens: [string, string][] = [
  ['--motion-instant', 'Press'], ['--motion-fast', 'Hover, unhover, color'], ['--motion-base', 'Menus, fields'], ['--motion-layout', 'Panel frames'], ['--motion-fold', 'Card folds'],
  ['--ease-standard', 'Feedback'], ['--ease-enter', 'Reveals'], ['--ease-layout', 'Layout'], ['--ease-fold', 'Folds'],
];
const typeSamples: [string, CSSProperties, string][] = [
  ['Panel title', { font: '500 13px/1.3 var(--sans)' }, 'Building an iteration gallery'],
  ['Message', { font: '400 13px/1.45 var(--sans)' }, 'The gallery camera now owns zoom directly.'],
  ['Control', { font: '500 12px/1.2 var(--sans)' }, 'Add milestone'],
  ['Chip', { font: '400 10px/1.2 var(--sans)' }, 'homescreen'],
  ['View label', { font: '400 11px/1.45 var(--panel-view-font)' }, 'Gallery'],
];

/** Resolves each token to its final value (calc and color-mix included) by applying it to a hidden probe. */
function useTokenValues(names: string[], theme: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement);
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0';
    document.body.appendChild(probe);
    const resolve = (name: string) => {
      const value = raw.getPropertyValue(name).trim();
      if (/^(\d|calc\()/.test(value) && !/(ms|s)$/.test(value)) { probe.style.width = `var(${name})`; return `${Math.round(probe.getBoundingClientRect().width * 10) / 10}px`; }
      if (/^(#|rgb|color-mix|oklab|hsl)/.test(value)) { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; }
      return value;
    };
    setValues(Object.fromEntries(names.map(name => [name, resolve(name)])));
    probe.remove();
  }, [theme]);
  return values;
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return <section className="sys-section" id={id} aria-labelledby={`${id}-title`}>
    <header className="sys-section-head"><h2 id={`${id}-title`}>{title}</h2>{note && <p>{note}</p>}</header>
    {children}
  </section>;
}

export function SystemPage() {
  const [theme, setTheme] = useTheme();
  const names = [...colorGroups.flatMap(([, tokens]) => tokens.map(([name]) => name)), ...layoutTokens.map(([name]) => name), ...motionTokens.map(([name]) => name)];
  const values = useTokenValues(names, theme);
  const [folded, setFolded] = useState(false);

  return <div className="sys-page">
    <header className="sys-top">
      <strong>MitWerk system</strong>
      <nav className="sys-nav" aria-label="Sections">{['principles', 'color', 'layout', 'motion', 'type'].map(id => <a key={id} href={`#${id}`}>{id}</a>)}</nav>
      <button type="button" className="sys-theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><PhosphorIcon name={theme === 'dark' ? 'sun' : 'moon'} size={13}/>{theme === 'dark' ? 'Light' : 'Dark'}</button>
    </header>
    <main className="sys-main">
      <Section id="principles" title="Principles" note="Decisions taken while tuning the product itself. The full log is docs/design-system-rules.md.">
        <ol className="sys-principles">
          <li><strong>The tool leads.</strong> Chat, lists and controls stay quiet; the milestone invitation is the one loud moment.</li>
          <li><strong>Frames move, content doesn't.</strong> Panels stretch, squeeze and sweep; nothing inside them scales or ghosts.</li>
          <li><strong>No solid white strokes.</strong> Emphasis uses a soft stroke; the main branch is a light gray.</li>
          <li><strong>Chips only for categories.</strong> Buckets and pages are chips; free text is a frameless field.</li>
          <li><strong>Concentric corners.</strong> Anything inset in a panel takes the panel radius minus its inset.</li>
          <li><strong>Edges reach edges.</strong> Hover fills run to the panel edge; controls never clip at narrow widths.</li>
        </ol>
      </Section>

      <Section id="color" title="Color" note={`Live values in ${theme} mode. Dark is the default.`}>
        {colorGroups.map(([group, tokens]) => <div key={group} className="sys-group">
          <h3 className="sys-sub">{group}</h3>
          <div className="sys-swatches">{tokens.map(([name, use]) => <figure key={name} className="sys-swatch">
            <span className="sys-swatch-chip" style={{ background: `var(${name})` }}/>
            <figcaption><span>{use}</span><code>{name}</code><code className="sys-value">{values[name]}</code></figcaption>
          </figure>)}</div>
        </div>)}
      </Section>

      <Section id="layout" title="Layout" note="Spacing and radius tokens, drawn at true size.">
        <dl className="sys-rows">{layoutTokens.map(([name, use]) => <div key={name}>
          <dt><span>{use}</span><code>{name}</code></dt>
          <dd><i className="sys-bar" style={{ width: `var(${name})` }}/><code>{values[name]}</code></dd>
        </div>)}</dl>
      </Section>

      <Section id="motion" title="Motion" note="Every transition reads these tokens. Try the fold, which uses the fold timing.">
        <dl className="sys-rows">{motionTokens.map(([name, use]) => <div key={name}><dt><span>{use}</span><code>{name}</code></dt><dd><code>{values[name]}</code></dd></div>)}</dl>
        <div className="sys-motion-demo">
          <button type="button" className="sys-theme" onClick={() => setFolded(value => !value)}>{folded ? 'Unfold' : 'Fold'}</button>
          <div className={`sys-fold${folded ? ' is-folded' : ''}`}><span className="sys-fold-preview"/><span>Version block #41, Prompt #320</span></div>
        </div>
      </Section>

      <Section id="type" title="Type" note="Neurial Grotesk for the interface; mono only for the view label.">
        <dl className="sys-rows">{typeSamples.map(([use, style, sample]) => <div key={use}><dt><span>{use}</span></dt><dd style={style}>{sample}</dd></div>)}</dl>
      </Section>
    </main>
  </div>;
}

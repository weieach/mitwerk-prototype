import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../shared/theme';
import { PhosphorIcon } from '../components/PhosphorIcon';
import './system-page.css';

/** Live reference for the tokens the product actually uses. Every value is read from the running stylesheet, so it never drifts from the app; tokens the stylesheet does not define are left out. */
const colorGroups: [string, [string, string][]][] = [
  ['Surfaces', [['--workspace-background', 'Behind panels'], ['--chrome', 'Chrome'], ['--paper', 'Panel'], ['--fill', 'Control fill'], ['--fill-hover', 'Hover fill'], ['--selection', 'Selection'], ['--user-message-fill', 'Own message'], ['--message-version-fill', 'In-chat card'], ['--composer-drawer-surface', 'To-do section'], ['--composer-drawer-glow', 'To-do glow'], ['--composer-surface', 'Message box'], ['--composer-mode-track', 'Mode toggle track']]],
  ['Chips', [['--capture-chip-surface', 'Bucket chip'], ['--capture-option-surface', 'Bucket option'], ['--capture-new-surface', 'Add new'], ['--view-tag-bg', 'View tag']]],
  ['Text', [['--ink', 'Primary'], ['--muted', 'Secondary'], ['--faint', 'Tertiary'], ['--accent', 'Accent'], ['--capture-detail-placeholder', 'Placeholder']]],
  ['Blue', [['--cursor-blue', 'Dark mode blue: active view text']]],
  ['Lines and strokes', [['--line', 'Hairline'], ['--line-strong', 'Divider'], ['--row-divider', 'Footer divider'], ['--panel-heading-divider', 'Title divider'], ['--panel-divider', 'Inside panels'], ['--popover-border', 'Popover outline'], ['--stroke-strong', 'Emphasis stroke'], ['--inline-field-line', 'Field underline']]],
  ['Branches and accents', [['--contrast', 'Main branch'], ['--mw-dock', 'Dock blue'], ['--mw-route', 'Route yellow'], ['--mw-assemble', 'Assemble green'], ['--mw-handoff', 'Handoff pink'], ['--mw-pulse', 'Pulse orange'], ['--mw-misregister', 'Misregister purple']]],
  ['Milestone gradient', [['--milestone-invite-dock', 'Stop 1'], ['--milestone-invite-route', 'Stop 2'], ['--milestone-invite-assemble', 'Stop 3'], ['--milestone-invite-handoff', 'Stop 4'], ['--milestone-invite-pulse', 'Stop 5'], ['--milestone-invite-misregister', 'Stop 6'], ['--milestone-invite-ink', 'Milestone ink']]],
];
const layoutTokens: [string, string][] = [
  ['--space-scale', 'Spacing scale'], ['--workspace-gutter', 'Panel to screen edge'], ['--workspace-edge', 'Panel to screen edge'], ['--workspace-panel-gap', 'Panel to panel'], ['--workspace-radius', 'Panel corner'],
  ['--chat-panel-width', 'Chat width beside panels'], ['--panel-heading-height', 'Panel title row'], ['--panel-title-text-inset', 'Title and chat text inset'],
  ['--panel-footer-height', 'Panel footer row'], ['--composer-inset', 'Message box inset'], ['--composer-drawer-radius', 'To-do section corner'],
  ['--composer-tool-inset', 'Composer tool inset'], ['--capture-chip-height', 'Every chip and capsule'], ['--capture-row-height', 'Capturing row'], ['--popover-radius', 'Popover corner'],
];
const motionTokens: [string, string][] = [
  ['--motion-instant', 'Press'], ['--motion-fast', 'Hover, unhover, color'], ['--motion-base', 'Enter'], ['--motion-exit', 'Exit'], ['--motion-stagger', 'Step between list items'], ['--motion-layout', 'Panel frames'], ['--motion-fold', 'Card folds'],
  ['--drawer-open-duration', 'To-do open'], ['--drawer-close-duration', 'To-do close'], ['--drawer-editing-fade', 'To-do edit fade'],
  ['--ease-standard', 'Feedback'], ['--ease-enter', 'Reveals'], ['--ease-exit', 'Exits'], ['--ease-layout', 'Layout'], ['--ease-fold', 'Folds'], ['--drawer-open-ease', 'To-do open curve'], ['--drawer-close-ease', 'To-do close curve'],
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
      if (/^-?[\d.]+$/.test(value)) return value;
      if (/^(\d|calc\(|min\(|max\(|clamp\()/.test(value) && !/(ms|s)$/.test(value)) { probe.style.width = `var(${name})`; return `${Math.round(probe.getBoundingClientRect().width * 10) / 10}px`; }
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
      <strong>verso system</strong>
      <nav className="sys-nav" aria-label="Sections">{['principles', 'color', 'layout', 'motion', 'type'].map(id => <a key={id} href={`#${id}`}>{id}</a>)}</nav>
      <button type="button" className="sys-theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><PhosphorIcon name={theme === 'dark' ? 'sun' : 'moon'} size={13}/>{theme === 'dark' ? 'Light' : 'Dark'}</button>
    </header>
    <main className="sys-main">
      <Section id="principles" title="Principles" note="The canonical verso design system, taken from the product itself. Summary: docs/design-system.md · restyle guide: docs/ui-restyle-guide.md · full log: docs/design-system-rules.md.">
        <ol className="sys-principles">
          <li><strong>The tool leads.</strong> Chat, lists and controls stay quiet; the milestone invitation is the one loud moment.</li>
          <li><strong>Chat holds its width.</strong> Beside other panels chat is a fixed column, at most 35% of the screen; the rest goes to the work.</li>
          <li><strong>No solid white strokes.</strong> Emphasis uses a soft stroke; the main branch is a light gray.</li>
          <li><strong>Chips only for categories.</strong> Buckets and pages are chips; free text is a frameless field.</li>
          <li><strong>Concentric corners.</strong> Anything inset in a panel takes the panel radius minus its inset.</li>
          <li><strong>Edges reach edges.</strong> Hover fills run to the panel edge; controls never clip at narrow widths.</li>
          <li><strong>Two chat edges.</strong> Frames line up with frames and text with text, from the title down to the message box.</li>
          <li><strong>Each mode its own palette.</strong> Dark mode deepens colors instead of reusing light values; dividers are dark gray, never black.</li>
        </ol>
      </Section>

      <Section id="color" title="Color" note={`Live values in ${theme} mode. Dark is the default.`}>
        {colorGroups.map(([group, tokens]) => [group, tokens.filter(([name]) => values[name])] as const).filter(([, tokens]) => tokens.length).map(([group, tokens]) => <div key={group} className="sys-group">
          <h3 className="sys-sub">{group}</h3>
          <div className="sys-swatches">{tokens.map(([name, use]) => <figure key={name} className="sys-swatch">
            <span className="sys-swatch-chip" style={{ background: `var(${name})` }}/>
            <figcaption><span>{use}</span><code>{name}</code><code className="sys-value">{values[name]}</code></figcaption>
          </figure>)}</div>
        </div>)}
      </Section>

      <Section id="layout" title="Layout" note="Spacing and radius tokens, drawn at true size.">
        <dl className="sys-rows">{layoutTokens.filter(([name]) => values[name]).map(([name, use]) => <div key={name}>
          <dt><span>{use}</span><code>{name}</code></dt>
          <dd><i className="sys-bar" style={{ width: `var(${name})` }}/><code>{values[name]}</code></dd>
        </div>)}</dl>
      </Section>

      <Section id="motion" title="Motion" note="Every transition reads these tokens. Try the fold, which uses the fold timing.">
        <dl className="sys-rows">{motionTokens.filter(([name]) => values[name]).map(([name, use]) => <div key={name}><dt><span>{use}</span><code>{name}</code></dt><dd><code>{values[name]}</code></dd></div>)}</dl>
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

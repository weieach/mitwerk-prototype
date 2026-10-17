import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../shared/theme';
import { PhosphorIcon } from '../components/PhosphorIcon';
import { BucketChip, CaptureLine, ComposerTabs, MetaLabel, TodoList, bucketHues } from './components';
import type { ComposerMode, Todo } from './components';
import './tokens.css';
import './components.css';
import './system-page.css';

const grays = ['0', '50', '100', '150', '200', '300', '400', '500', '600', '700', '800', '850', '900', '950'];
const blues = ['100', '200', '300', '400', '500', '600', '800', '900'];
const semantic: [string, string][] = [
  ['bg-canvas', 'Page behind panels'], ['bg-surface', 'Panels'], ['bg-raised', 'Cards, composer'], ['bg-sunken', 'Inputs, wells'], ['bg-hover', 'Row hover'], ['bg-selected', 'Selected row'],
  ['text-primary', 'Titles, body'], ['text-secondary', 'Supporting'], ['text-tertiary', 'Metadata'], ['accent', 'Milestone, focus'], ['accent-soft', 'Accent wash'], ['success', 'Done'], ['warning', 'Needs review'], ['danger', 'Error'],
];
const typeScale: [string, string, string][] = [
  ['numeral', '27', 'Counts, big stats'], ['display', 'Build the gallery', 'Milestone progress'], ['title', 'Isometric album with date ruler', 'Card titles'],
  ['body', 'Parse capture filenames into frames and versions.', 'Messages, to-dos'], ['control', 'Add milestone', 'Buttons, tabs'], ['meta', 'v14 → v19 · 4da75ec', 'Hashes, times'], ['label', 'Milestone · 03', 'Uppercase labels'],
];
const sampleTodos: Todo[] = [
  { id: 'a', text: 'Parse capture filenames into frames', done: true, bucket: 'homescreen', owner: 'Mit' },
  { id: 'b', text: 'Render blocks with WebGL', done: true, bucket: 'gallery', owner: 'Mit' },
  { id: 'c', text: 'Date ruler under versions', done: false, bucket: 'gallery', owner: 'You' },
  { id: 'd', text: 'Hover lifts frame and shows summary', done: false, bucket: 'editor overlay', owner: 'Mit' },
  { id: 'e', text: 'Create 3D shader for capture planes', done: false, owner: 'You' },
];
const buckets: [string, number][] = [['homescreen', 24], ['gallery', 18], ['editor overlay', 9], ['theater', 6], ['landing', 3], ['token view', 2]];

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return <section className="sys-section" id={id} aria-labelledby={`${id}-title`}>
    <header className="sys-section-head"><h2 id={`${id}-title`}>{title}</h2>{note && <p>{note}</p>}</header>
    {children}
  </section>;
}

function Swatch({ token, label }: { token: string; label?: string }) {
  return <figure className="sys-swatch">
    <span className="sys-swatch-chip" style={{ background: `var(${token})` } as CSSProperties}/>
    <figcaption><code>{token}</code>{label && <span>{label}</span>}</figcaption>
  </figure>;
}

export function SystemPage() {
  const [theme, setTheme] = useTheme();
  const [todos, setTodos] = useState(sampleTodos);
  const [mode, setMode] = useState<ComposerMode>('todo');
  const [activeBucket, setActiveBucket] = useState('gallery');
  const toggle = (id: string) => setTodos(list => list.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo));

  return <div className="sys-page">
    <header className="sys-top">
      <div className="sys-brand"><strong>MitWerk</strong><MetaLabel items={['Design system', 'v0.1', 'Dark first']}/></div>
      <nav className="sys-nav" aria-label="Sections">{['principles', 'tokens', 'type', 'todo', 'bucket', 'composed'].map(id => <a key={id} href={`#${id}`}>{id}</a>)}</nav>
      <button type="button" className="sys-theme" aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        <PhosphorIcon name={theme === 'dark' ? 'sun' : 'moon'} size={13}/>{theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </header>

    <main className="sys-main">
      <Section id="principles" title="Principles">
        <ol className="sys-principles">
          <li><strong>Instrument, not decoration.</strong> Style comes from type, grid and hairlines. Effects are rare.</li>
          <li><strong>Quiet work, loud milestones.</strong> Chat, lists and controls stay neutral. Accent, glow and grain belong to milestones.</li>
          <li><strong>Data in mono.</strong> Hashes, versions, counts and labels use the mono face with tabular numbers.</li>
          <li><strong>One accent.</strong> Blue means milestone or focus. Bucket hues only tag; they never fill.</li>
        </ol>
      </Section>

      <Section id="tokens" title="Tokens" note="Primitive → semantic → component. Components read semantic or component tokens only; themes swap the semantic layer.">
        <h3 className="sys-sub">Primitive · gray</h3>
        <div className="sys-ramp">{grays.map(step => <Swatch key={step} token={`--p-gray-${step}`}/>)}</div>
        <h3 className="sys-sub">Primitive · blue</h3>
        <div className="sys-ramp">{blues.map(step => <Swatch key={step} token={`--p-blue-${step}`}/>)}</div>
        <h3 className="sys-sub">Primitive · bucket hues</h3>
        <div className="sys-ramp">{bucketHues.map(hue => <Swatch key={hue} token={`--p-hue-${hue}`}/>)}</div>
        <h3 className="sys-sub">Semantic · {theme}</h3>
        <div className="sys-grid">{semantic.map(([name, label]) => <Swatch key={name} token={`--s-${name}`} label={label}/>)}</div>
      </Section>

      <Section id="type" title="Type" note="Neurial Grotesk for interface, mono for data.">
        <dl className="sys-type">{typeScale.map(([name, sample, use]) => <div key={name}>
          <dt><code>--s-text-{name}</code><span>{use}</span></dt>
          <dd className={name === 'label' ? 'is-label' : undefined} style={{ font: `var(--s-text-${name})` }}>{sample}</dd>
        </div>)}</dl>
      </Section>


      <Section id="todo" title="To-do" note="Rows, not cards. Mono index, square check, bucket tag and owner on the right. Click to toggle.">
        <div className="sys-panel"><TodoList title="To-do" todos={todos} onToggle={toggle}/></div>
      </Section>

      <Section id="bucket" title="Capture bucket" note="User-named pages for capture and self-sorting. Hue is derived from the name, so it stays stable.">
        <h3 className="sys-sub">States</h3>
        <div className="sys-inline">
          <BucketChip name="homescreen"/>
          <BucketChip name="homescreen" count={24}/>
          <BucketChip name="homescreen" active count={24}/>
          <BucketChip name="homescreen" editable/>
          <BucketChip name="homescreen" size="sm"/>
        </div>
        <h3 className="sys-sub">In a sentence</h3>
        <CaptureLine bucket="homescreen" detail="editor overlay"/>
        <h3 className="sys-sub">Filter bar</h3>
        <div className="sys-inline" role="group" aria-label="Filter by bucket">
          {buckets.map(([name, count]) => <BucketChip key={name} name={name} count={count} active={activeBucket === name} onClick={() => setActiveBucket(name)}/>)}
          <button type="button" className="sys-add"><PhosphorIcon name="plus" size={11}/>New bucket</button>
        </div>
      </Section>

      <Section id="composed" title="Composed" note="How the parts sit together in the composer and a to-do group.">
        <div className="sys-row is-2">
          <div className="sys-composer">
            <ComposerTabs value={mode} onChange={setMode}/>
            <div className={`sys-composer-body is-${mode}`}>
              {mode === 'todo' ? <TodoList todos={todos.slice(2)} onToggle={toggle}/> : <p className="sys-placeholder">{mode === 'prompt' ? 'Message…' : 'Name the milestone…'}</p>}
              <footer className="sys-composer-foot">
                <span><PhosphorIcon name="plus" size={14}/></span>
                <span className="sys-model">Sonnet 5</span>
                <CaptureLine bucket="homescreen" detail="details"/>
                <button type="button" className="sys-send" aria-label="Send"><PhosphorIcon name="arrow-up" size={14}/></button>
              </footer>
            </div>
          </div>
          <div className="sys-group">
            <TodoList todos={todos} onToggle={toggle}/>
          </div>
        </div>
      </Section>
    </main>
  </div>;
}

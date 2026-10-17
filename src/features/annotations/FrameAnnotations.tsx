import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { galleryTokens } from '../iteration-gallery/tokens';
import type { AnnotationFrame, FrameAnnotation } from './model';
import { annotationFrame } from './model';
import { deleteAnnotation, putAnnotation, useAnnotations } from './store';
import './annotations.css';

export function FrameAnnotations({ frame, active, onOpen, color }: { frame: AnnotationFrame; active: boolean; onOpen: () => void; color: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  const notes = useAnnotations().filter(note => note.frame.id === frame.id);
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const capture = new URLSearchParams(location.search);
  useEffect(() => {
    setReady(false); setOpened(false);
    if (!active) return;
    const timer = setTimeout(() => setReady(true), galleryTokens.theater.enterDelayMs);
    return () => clearTimeout(timer);
  }, [frame.id, active]);
  useEffect(() => {
    if (ready && capture.get('screenshot') === '1' && capture.get('annotationOverlay') === '1' && (!capture.get('frameNumber') || frame.number === Number(capture.get('frameNumber')))) {
      onOpen(); setOpened(true);
    }
  }, [ready, frame.id]);
  return <div ref={anchor} className="frame-annotation-bookmark" data-orbit-blocked style={{ '--annotation-color': color, '--annotation-ink': 'var(--on-pale)' } as CSSProperties}>
    <button type="button" className={`annotation-tag${ready ? ' is-ready' : ''}`} disabled={!ready} aria-label={notes.length ? `Open ${notes.length} annotations` : 'New annotation'} onClick={() => { onOpen(); setOpened(true); }}>
      <PhosphorIcon name={notes.length ? "chat-circle-dots" : "chat-circle"} size="var(--annotation-pill-icon-size)"/>{notes.length ? <strong>{notes.length}</strong> : <span>New annotation…</span>}
    </button>
    {opened && <AnnotationOverlay frame={frame} container={anchor.current!.closest<HTMLElement>('.iteration-gallery')!} onClose={() => setOpened(false)}/>}
  </div>;
}

export function AnnotationOverlay({ frame, container, onClose, onReturn = onClose }: { frame: AnnotationFrame; container: HTMLElement; onClose: () => void; onReturn?: () => void }) {
  const notes = useAnnotations().filter(note => note.frame.id === frame.id);
  const [editing, setEditing] = useState<FrameAnnotation | 'new' | null>(() => notes.length ? null : 'new');
  const [text, setText] = useState('');
  const [todo, setTodo] = useState(false);
  const [error, setError] = useState('');
  const [savedTodo, setSavedTodo] = useState(false);
  const [entered, setEntered] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.show();
    const siblings = [...container.children].filter(child => child !== element) as HTMLElement[];
    const prior = siblings.map(child => child.inert);
    siblings.forEach(child => { child.inert = true; });
    return () => { siblings.forEach((child, i) => { child.inert = prior[i]; }); element.close(); previous?.isConnected && previous.focus(); };
  }, []);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setEntered(true), reduced ? 0 : galleryTokens.annotations.uiDelayMs + galleryTokens.annotations.enterMs);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!entered) return;
    if (savedTodo) dialog.current?.querySelector<HTMLButtonElement>('.annotation-confirmation button')?.focus();
    else if (editing) textarea.current?.focus();
    else dialog.current?.querySelector<HTMLButtonElement>('.annotation-list button, .annotation-create')?.focus();
  }, [editing, savedTodo, entered]);
  function edit(note: FrameAnnotation | 'new') {
    setEditing(note); setText(note === 'new' ? '' : note.text); setTodo(note !== 'new' && note.todo); setError('');
  }
  function save() {
    const date = new Date().toISOString();
    const original = editing && editing !== 'new' ? editing : null;
    try {
      putAnnotation({ id: original?.id ?? crypto.randomUUID(), frame: annotationFrame(frame), text, todo,
        status: original?.status ?? 'To do', createdAt: original?.createdAt ?? date, updatedAt: date, chatId: original?.chatId });
      setEditing(null); setError(''); setSavedTodo(todo);
    } catch { setError('Your browser could not save this note. Free some local storage and try again.'); }
  }
  function remove() {
    if (!editing || editing === 'new') return;
    try { deleteAnnotation(editing.id); setEditing(null); setError(''); }
    catch { setError('Could not delete this annotation. Please try again.'); }
  }
  return createPortal(<dialog ref={dialog} className="annotation-overlay" data-entered={entered} aria-label={savedTodo ? 'To-do saved' : editing ? editing === 'new' ? 'Create annotation' : 'Edit annotation' : 'Annotations'}
    style={{ '--annotation-blur': `${galleryTokens.annotations.blur}px`, '--annotation-blur-ms': `${galleryTokens.annotations.blurMs}ms`, '--annotation-frame-delay': `${galleryTokens.annotations.frameDelayMs}ms`, '--annotation-ui-delay': `${galleryTokens.annotations.uiDelayMs}ms`, '--annotation-enter-ms': `${galleryTokens.annotations.enterMs}ms`, '--annotation-message-stagger': `${galleryTokens.annotations.messageStaggerMs}ms`, '--annotation-message-enter': `${galleryTokens.annotations.messageEnterMs}ms` } as CSSProperties}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (savedTodo) setSavedTodo(false); else onClose(); }
      if (event.key !== 'Tab') return;
      const items = [...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, input')];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { event.preventDefault(); onClose(); }} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <button className="gallery-back annotation-return" onClick={onReturn}><PhosphorIcon name="arrow-left"/>Theater</button>
    <div className="annotation-body" inert={!entered}>
    {savedTodo ? <section className="annotation-sheet annotation-confirmation" role="alertdialog" aria-label="To-do saved" aria-describedby="annotation-todo-confirmation-copy">
      <PhosphorIcon name="check-circle" size={28}/><h2>To-do saved</h2>
      <p id="annotation-todo-confirmation-copy">Your annotation is on the Todos dashboard. View all tasks there, or stay here to keep reviewing this frame.</p>
      <div className="modal-actions"><button className="mw-button" onClick={() => setSavedTodo(false)}>Stay here</button><button className="mw-button primary" onClick={() => { onClose(); window.dispatchEvent(new Event('mitwerk-open-todos')); }}><PhosphorIcon name="list-checks"/>View all tasks</button></div>
    </section> : <section className="annotation-sheet">
      <header><h2><PhosphorIcon name="chat-circle-dots" size="var(--row-title-size)"/>{editing ? editing === 'new' ? 'Create annotation' : 'Edit annotation' : 'Annotations'}</h2><button className="icon-button" aria-label="Close annotations and return to theater" onClick={onReturn}><PhosphorIcon name="x" size="var(--row-title-size)"/></button></header>
      <img className="annotation-preview" src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`Frame ${frame.number}: ${frame.summary}`}/>
      {editing ? <form onSubmit={event => { event.preventDefault(); save(); }}>
        <textarea ref={textarea} aria-label="Annotation" value={text} onChange={event => setText(event.target.value)} placeholder="Write a note or a prompt for your agent to work on later…" required/>
        <div className="annotation-form-actions"><label><input type="checkbox" checked={todo} onChange={event => setTodo(event.target.checked)}/>Mark as to-do</label><div>
          {editing !== 'new' && <button type="button" className="annotation-delete" onClick={remove}>Delete</button>}
          <button type="submit" className="mw-button primary annotation-save" disabled={!text.trim()}>{todo ? 'Save as to-do' : 'Save as note'}</button>
        </div></div>
      </form> : <><div className="annotation-list" aria-label="Saved annotations">{notes.length ? notes.map((note, index) => <button key={note.id} className="annotation-message" style={{ '--annotation-message-index': index } as CSSProperties} onClick={() => edit(note)}><span className="annotation-message-body">{note.text}</span><span className="annotation-message-meta"><span className="annotation-kind"><PhosphorIcon name={note.todo ? 'check-square' : 'note'}/>{note.todo ? note.status : 'Note'}</span><time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time><PhosphorIcon name="pencil-simple" size="var(--meta-font-size)"/></span></button>) : <p>No annotations yet.</p>}</div><button className="mw-button primary annotation-create" onClick={() => edit('new')}><PhosphorIcon name="plus"/>Create new annotation</button></>}
      {error && <p role="alert">{error}</p>}
    </section>}
    </div>
  </dialog>, container);
}

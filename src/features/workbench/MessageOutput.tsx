import { MilestoneInvitationControls } from './MilestoneInvitationControls';
import { ArrowUpRight } from '../../components/PhosphorIcon';
import { milestoneInviteGradient, milestoneInviteMotion } from './milestone-invite';
import type { CSSProperties } from 'react';
import type { Message } from './model';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MilestoneButton } from '../version-tree/MilestoneControls';
import { captureMilestoneKey, milestoneStorageKey, milestonesChangedEvent, parseMilestones } from '../version-tree/idea-stream';

/** The same output treatment is available to any conversation message. */
export function MessageOutput({ output, onOpen }: { output: NonNullable<Message['versionOutput']>; onOpen: (milestone?: boolean) => void }) {
  const key = output.version === undefined ? null : captureMilestoneKey(output.version);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const read = () => { try { return key ? parseMilestones(localStorage.getItem(milestoneStorageKey))[key] ?? '' : ''; } catch { return ''; } };
  const [milestone, setMilestone] = useState(read);
  const [savePulse, setSavePulse] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [jumping, setJumping] = useState(false);
  const [invited, setInvited] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const [decodedCover, setDecodedCover] = useState<string | null>(null);
  const [controlsReady, setControlsReady] = useState(false);
  const previousHeight = useRef(0);
  const coverReady = !!output.imageUrl && decodedCover === output.imageUrl;
  useLayoutEffect(() => {
    const cover = image.current!;
    let cancelled = false;
    const loaded = async () => {
      if (!cover.naturalWidth) return;
      try { await cover.decode(); } catch { return; }
      if (!cancelled) setDecodedCover(output.imageUrl ?? null);
    };
    cover.addEventListener('load', loaded);
    if (cover.complete) void loaded();
    return () => { cancelled = true; cover.removeEventListener('load', loaded); };
  }, [output.imageUrl]);
  useLayoutEffect(() => {
    const card = root.current!.querySelector<HTMLElement>('.message-version-card')!;
    const main = card.querySelector<HTMLElement>('.message-version-main')!;
    const height = () => main.getBoundingClientRect().height + 2;
    const next = height(), previous = previousHeight.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = previous && Math.abs(previous - next) > 1 && !reduced && !card.closest('.is-chat-resizing')
      ? card.animate([{height:`${previous}px`}, {height:`${next}px`}], {duration:milestoneInviteMotion.heightDuration, easing:'cubic-bezier(.2,0,.2,1)'}) : null;
    previousHeight.current = next;
    const observer = new ResizeObserver(() => { previousHeight.current = height(); });
    observer.observe(main);
    return () => { animation?.cancel(); observer.disconnect(); };
  }, [invited]);
  useEffect(() => {
    setControlsReady(false);
    if (!invited || !coverReady) return;
    const timer = setTimeout(() => setControlsReady(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milestoneInviteMotion.heightDuration + 32);
    return () => clearTimeout(timer);
  }, [invited, coverReady]);
  useEffect(() => {
    setInvited(false); setJumping(false);
    if (!key || milestone || dismissedKey === key || !coverReady) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let visible = false, started = false;
    const clear = () => { timers.forEach(clearTimeout); timers.length = 0; };
    const schedule = () => {
      if (started) return;
      clear();
      if (!visible || document.hidden) return;
      timers.push(setTimeout(() => {
        started = true;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        setJumping(!reduced);
        timers.push(setTimeout(() => setInvited(true), reduced ? 0 : milestoneInviteMotion.impact));
        timers.push(setTimeout(() => setJumping(false), milestoneInviteMotion.duration));
      }, milestoneInviteMotion.delay));
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold:.1});
    observer.observe(root.current!);
    document.addEventListener('visibilitychange', schedule);
    return () => { clear(); observer.disconnect(); document.removeEventListener('visibilitychange', schedule); };
  }, [key, milestone, dismissedKey, coverReady]);
  const openMilestone = () => {
    setDismissedKey(key); setInvited(false); setJumping(false);
    onOpen(true);
  };

  useEffect(() => {
    let previous = read();
    setMilestone(previous); setSavePulse(0);
    const sync = () => {
      const next = read();
      if (next && next !== previous) setSavePulse(pulse => pulse + 1);
      previous = next;
      setMilestone(next);
    };
    window.addEventListener('storage', sync);
    window.addEventListener(milestonesChangedEvent, sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(milestonesChangedEvent, sync); };
  }, [key]);
  return <div ref={root} className={`message-version-output${jumping ? ' is-milestone-jumping' : ''}${invited ? ' is-milestone-ready' : ''}`} style={{'--milestone-invite-gradient':milestoneInviteGradient, '--milestone-bump-duration':`${milestoneInviteMotion.duration}ms`} as CSSProperties}>
    <div className="message-version-card">
      <span className="message-version-placeholder" aria-hidden="true"/>
      <button type="button" className="message-version-main" aria-label={invited ? "You've accomplished a lot! Ready to mark a new milestone?" : `Version block #${output.version}, Prompt #${output.prompt}`} onClick={invited ? openMilestone : () => onOpen()}>
        <span className="message-version-preview"><img ref={image} src={`${import.meta.env.BASE_URL}${output.imageUrl}`} alt="Preview of the generated interface"/></span>
        <span className="message-version-label">
          {invited ? <span className="milestone-label-swap"><span aria-hidden="true" className="panel-view-word is-leaving">{`Version block #${output.version}, Prompt #${output.prompt}`}</span><span className="panel-view-word milestone-invite-word">You've accomplished a lot!<br/>Ready to mark a new milestone?</span></span> : <span>{`Version block #${output.version}, Prompt #${output.prompt}`}</span>}
          {!invited && <ArrowUpRight size={14}/>}
        </span>
      </button>
      {invited && controlsReady && coverReady && <MilestoneInvitationControls onOpen={openMilestone} onDismiss={() => { setDismissedKey(key); setInvited(false); setJumping(false); }}/>}
    </div>
    {!invited && <MilestoneButton disabled={!key} editing={Boolean(milestone)} saved={Boolean(milestone)} savePulse={savePulse} onClick={openMilestone}/>}
  </div>;
}

import { MilestoneInvitationControls } from './MilestoneInvitationControls';
import { ArrowUpRight } from '../../components/PhosphorIcon';
import { milestoneInviteGradient, milestoneInviteMotion } from './milestone-invite';
import type { CSSProperties } from 'react';
import type { Message } from './model';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MilestoneButton } from '../version-tree/MilestoneControls';
import { captureMilestoneKey, milestoneStorageKey, milestonesChangedEvent, parseMilestones } from '../version-tree/idea-stream';

/** The same output treatment is available to any conversation message. */
export function MessageOutput({ output, onOpen }: { output: NonNullable<Message['versionOutput']>; onOpen: (milestone?: boolean, onMilestoneClose?: () => void) => void }) {
  const key = output.version === undefined ? null : captureMilestoneKey(output.version);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const read = () => { try { return key ? parseMilestones(localStorage.getItem(milestoneStorageKey))[key] ?? '' : ''; } catch { return ''; } };
  const [milestone, setMilestone] = useState(read);
  const [savePulse, setSavePulse] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [jumping, setJumping] = useState(false);
  const [invited, setInvited] = useState(false);
  const [invitationPhase, setInvitationPhase] = useState<'idle' | 'overlay' | 'exiting'>('idle');
  const phase = useRef(invitationPhase);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeKey = useRef(key);
  activeKey.current = key;
  useEffect(() => {
    phase.current = 'idle'; setInvitationPhase('idle');
    return () => { clearTimeout(exitTimer.current); phase.current = 'idle'; };
  }, [key]);
  const image = useRef<HTMLImageElement>(null);
  const [imageAspect, setImageAspect] = useState<number | undefined>();
  const [decodedCover, setDecodedCover] = useState<string | null>(null);
  const [controlsReady, setControlsReady] = useState(false);
  const previousHeight = useRef(0);
  const coverReady = !!output.imageUrl && decodedCover === output.imageUrl;
  useLayoutEffect(() => {
    const cover = image.current!;
    setDecodedCover(null);
    let cancelled = false;
    const loaded = async () => {
      if (!cover.naturalWidth) return;
      try { await cover.decode(); } catch { return; }
      if (!cancelled) {
        setImageAspect(cover.naturalWidth / cover.naturalHeight);
        setDecodedCover(output.imageUrl ?? null);
      }
    };
    cover.addEventListener('load', loaded);
    if (cover.complete) void loaded();
    return () => { cancelled = true; cover.removeEventListener('load', loaded); };
  }, [output.imageUrl]);
  useLayoutEffect(() => {
    if (!coverReady) { previousHeight.current = 0; return; }
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
  }, [invited, coverReady]);
  useEffect(() => {
    setControlsReady(false);
    if (!invited || !coverReady) return;
    const timer = setTimeout(() => setControlsReady(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milestoneInviteMotion.heightDuration + 32);
    return () => clearTimeout(timer);
  }, [invited, coverReady]);
  useEffect(() => {
    if (phase.current !== 'idle') return;
    setInvited(false); setJumping(false);
    if (output.inviteMilestone === false || !key || milestone || dismissedKey === key || !coverReady) return;
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
  }, [key, milestone, dismissedKey, coverReady, output.inviteMilestone]);
  const finishInvitation = () => {
    if (activeKey.current !== key || phase.current === 'exiting') return;
    phase.current = 'exiting'; setInvitationPhase('exiting'); setJumping(false);
    exitTimer.current = setTimeout(() => {
      setDismissedKey(key); setInvited(false);
      phase.current = 'idle'; setInvitationPhase('idle');
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milestoneInviteMotion.exitDuration);
  };
  const openMilestone = () => {
    if (phase.current !== 'idle') return;
    if (invited) {
      phase.current = 'overlay'; setInvitationPhase('overlay'); setJumping(false);
      onOpen(true, () => { if (phase.current === 'overlay') finishInvitation(); });
    } else onOpen(true);
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
  return <div ref={root} hidden={!coverReady} className={`message-version-output${jumping ? ' is-milestone-jumping' : ''}${invited ? ' is-milestone-ready' : ''}${invitationPhase !== 'idle' ? ` is-invitation-${invitationPhase}` : ''}`} style={{'--message-image-aspect':imageAspect, '--milestone-invite-gradient':milestoneInviteGradient, '--milestone-bump-duration':`${milestoneInviteMotion.duration}ms`, '--milestone-controls-exit-delay':`${milestoneInviteMotion.controlsExitDelay}ms`, '--milestone-controls-exit-duration':`${milestoneInviteMotion.controlsExitDuration}ms`, '--milestone-invite-exit-duration':`${milestoneInviteMotion.exitDuration}ms`} as CSSProperties}>
    <div className="message-version-card">
      <span className="message-version-placeholder" aria-hidden="true"/>
      <button type="button" className="message-version-main" disabled={invitationPhase !== 'idle'} aria-label={invited ? "You've accomplished a lot! Ready to mark a new milestone?" : `Version block #${output.version}, Prompt #${output.prompt}`} onClick={invited ? openMilestone : () => onOpen()}>
        <span className="message-version-preview"><img ref={image} src={`${import.meta.env.BASE_URL}${output.imageUrl}`} alt="Preview of the generated interface"/></span>
        <span className="message-version-label">
          {invitationPhase === 'exiting' ? <span className="milestone-label-swap is-returning"><span aria-hidden="true" className="milestone-return-leaving">You've accomplished a lot!<br/>Ready to mark a new milestone?</span><span className="milestone-return-default">{`Version block #${output.version}, Prompt #${output.prompt}`}</span></span> : invited ? <span className="milestone-label-swap"><span aria-hidden="true" className="panel-view-word is-leaving">{`Version block #${output.version}, Prompt #${output.prompt}`}</span><span className="panel-view-word milestone-invite-word">You've accomplished a lot!<br/>Ready to mark a new milestone?</span></span> : <span>{`Version block #${output.version}, Prompt #${output.prompt}`}</span>}
          {(!invited || invitationPhase === 'exiting') && <ArrowUpRight size={14}/>}
        </span>
      </button>
      {invited && controlsReady && coverReady && <MilestoneInvitationControls leaving={invitationPhase !== 'idle'} onOpen={openMilestone} onDismiss={finishInvitation}/>}
    </div>
    {!invited && <MilestoneButton disabled={!key} editing={Boolean(milestone)} saved={Boolean(milestone)} savePulse={savePulse} onClick={openMilestone}/>}
  </div>;
}

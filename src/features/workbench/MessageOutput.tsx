import { ArrowUpRight } from '../../components/PhosphorIcon';
import { milestoneInviteGradient, milestoneInviteMotion } from './milestone-invite';
import type { CSSProperties } from 'react';
import type { Message } from './model';
import { useEffect, useRef, useState } from 'react';
import { MilestoneButton } from '../version-tree/MilestoneControls';
import { captureMilestoneKey, milestoneStorageKey, milestonesChangedEvent, parseMilestones } from '../version-tree/idea-stream';

/** The same output treatment is available to any conversation message. */
export function MessageOutput({ output, onOpen }: { output: NonNullable<Message['versionOutput']>; onOpen: (milestone?: boolean) => void }) {
  const key = output.version === undefined ? null : captureMilestoneKey(output.version);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const read = () => { try { return key ? parseMilestones(localStorage.getItem(milestoneStorageKey))[key] ?? '' : ''; } catch { return ''; } };
  const [milestone, setMilestone] = useState(read);
  const root = useRef<HTMLDivElement>(null);
  const [jumping, setJumping] = useState(false);
  const [invited, setInvited] = useState(false);
  useEffect(() => {
    setInvited(false); setJumping(false);
    if (!key || milestone || dismissedKey === key) return;
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
  }, [key, milestone, dismissedKey]);
  const openMilestone = () => onOpen(true);

  useEffect(() => {
    const sync = () => setMilestone(read());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(milestonesChangedEvent, sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(milestonesChangedEvent, sync); };
  }, [key]);
  return <div ref={root} className={`message-version-output${jumping ? ' is-milestone-jumping' : ''}${invited ? ' is-milestone-ready' : ''}${key && dismissedKey === key ? ' is-milestone-dismissed' : ''}`} style={{'--milestone-invite-gradient':milestoneInviteGradient, '--milestone-bump-duration':`${milestoneInviteMotion.duration}ms`} as CSSProperties}>
    <button type="button" className="message-version-card" aria-label={invited ? 'Ready to mark a new milestone?' : `Version block #${output.version}, Prompt #${output.prompt}`} onClick={invited ? openMilestone : () => onOpen()}>
      <span className="message-version-preview"><img src={`${import.meta.env.BASE_URL}${output.imageUrl}`} alt="Preview of the generated interface"/></span>
      <span className="message-version-label"><span>{invited ? 'Ready to mark a new milestone?' : `Version block #${output.version}, Prompt #${output.prompt}`}</span></span>
      <ArrowUpRight size={14}/>
    </button>
    {invited ? <button type="button" className="milestone-not-yet" onClick={() => { setDismissedKey(key); setInvited(false); setJumping(false); }}>Not yet</button> : <MilestoneButton disabled={!key} editing={Boolean(milestone)} onClick={openMilestone}/>}
  </div>;
}

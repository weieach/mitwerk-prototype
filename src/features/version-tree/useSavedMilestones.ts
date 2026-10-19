import { useEffect, useState } from 'react';
import { milestoneStorageKey, milestonesChangedEvent, parseMilestones, type Milestones } from './idea-stream';

function readMilestones(): Milestones {
  try { return parseMilestones(localStorage.getItem(milestoneStorageKey)); } catch { return {}; }
}

/** Saved milestones, kept live across the Idea stream, chat version cards and Playback. */
export function useSavedMilestones() {
  const [milestones, setMilestones] = useState<Milestones>(readMilestones);
  useEffect(() => {
    const sync = () => setMilestones(readMilestones());
    const storage = (event: StorageEvent) => { if (event.key === milestoneStorageKey) sync(); };
    window.addEventListener('storage', storage);
    window.addEventListener(milestonesChangedEvent, sync);
    return () => { window.removeEventListener('storage', storage); window.removeEventListener(milestonesChangedEvent, sync); };
  }, []);
  return milestones;
}

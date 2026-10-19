import { Icon } from '../../components/Icon';
import type { JumpScale } from './timeline';

const unitName = (scale: JumpScale) => scale === 'frame' ? 'prompt' : scale;

/** Previous/next steps by the Play unit chosen in Controls: a prompt, a version's push or a milestone's push. */
export function PlaybackJump({ direction, scale, unavailable, onJump }: {
  direction: -1 | 1; scale: JumpScale; unavailable: boolean; onJump: () => void;
}) {
  return <span className="playback-jump">
    <button type="button" className="icon-button" aria-label={`Jump to ${direction === -1 ? 'previous' : 'next'} ${unitName(scale)}`}
      aria-disabled={unavailable} onClick={() => { if (!unavailable) onJump(); }}>
      <Icon name={direction === -1 ? 'previous' : 'next'}/>
    </button>
  </span>;
}

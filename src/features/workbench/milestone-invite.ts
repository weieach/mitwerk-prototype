import { inviteGradientStops } from '../../shared/palette';

export const milestoneInviteMotion = { delay:3000, impact:240, duration:650, heightDuration:280, controlsExitDelay:300, controlsExitDuration:320, exitDuration:520 } as const;

/** Bundled sample used by `?milestone=1` when the capture manifest has no frames. */
export const milestonePreviewSample = { version:40, imageUrl:'examples/iteration-preview.png' } as const;

/** Invitation stops follow the theme: each palette accent has a dark-mode and a light-mode gradient variant. */
export const milestoneInviteGradient = `linear-gradient(110deg, ${inviteGradientStops.join(', ')})`;

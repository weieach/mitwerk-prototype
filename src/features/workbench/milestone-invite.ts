import { treeTheme } from '../version-tree/tokens';

export const milestoneInviteMotion = { delay:3000, impact:240, duration:650 } as const;

/** Derive invitation colors from the same palette as graph routes. */
export const milestoneInviteGradient = `linear-gradient(110deg, ${treeTheme.routes.map(color => `color-mix(in srgb, ${color} var(--milestone-invite-color-strength), black)`).join(', ')})`;

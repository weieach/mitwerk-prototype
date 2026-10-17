import type { CSSProperties } from 'react';
import { PhosphorIcon, FullscreenIcon } from './PhosphorIcon';

const names = {
  info: 'info',
  branch: 'git-branch',
  commit: 'git-commit',
  plus: 'plus',
  minus: 'minus',
  expand: 'corners-out',
  grid: 'grid-four',
  arrow: 'arrow-right',
  chevron: 'caret-right',
  caret: 'caret-down',
  code: 'code',
  file: 'file-text',
  image: 'image',
  reference: 'plus-square',
  spark: 'sparkle',
  play: 'play',
  pause: 'pause',
  close: 'x',
  locate: 'crosshair',
  check: 'check',
  layers: 'stack',
  more: 'dots-three-vertical',
  revert: 'arrow-u-up-left',
  restore: 'arrow-u-up-right',
  previous: 'rewind',
  next: 'fast-forward',
} as const;
export type IconName = keyof typeof names;

export function Icon({ name, size = 16, style, weight: requestedWeight }: { name: IconName; size?: number; style?: CSSProperties; weight?: 'regular' | 'fill' }) {
  if (name === 'expand') return <FullscreenIcon size={size} style={style} weight={requestedWeight}/>;
  const weight = requestedWeight ?? (['play', 'pause', 'previous', 'next'].includes(name) ? 'fill' : 'regular');
  return <PhosphorIcon name={names[name]} size={size} weight={weight} style={style}/>;
}

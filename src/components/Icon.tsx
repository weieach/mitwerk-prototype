import type { CSSProperties } from 'react';

export type IconName = 'info' | 'branch' | 'commit' | 'plus' | 'minus' | 'expand' | 'grid' | 'arrow' | 'chevron' | 'caret' | 'code' | 'file' | 'image' | 'spark' | 'play' | 'pause' | 'close' | 'locate' | 'check' | 'layers' | 'more' | 'revert' | 'restore';

const paths: Record<IconName, React.ReactNode> = {
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 7v10m0-5h5a7 7 0 0 0 7-4"/></>,
  commit: <><circle cx="12" cy="12" r="4"/><path d="M12 2v6m0 8v6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>,
  grid: <path strokeLinecap="butt" d="M6 5v14M12 5v14M18 5v14M6 5l12 7M6 12l12 7M6 12 18 5M6 19 18 12"/>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  chevron: <path d="m8 5 7 7-7 7"/>,
  caret: <path d="m7 9 5 5 5-5"/>,
  code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/>,
  file: <><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h5"/></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.5-4.5 2.5 2.5L16 11l4 4"/></>,
  spark: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  pause: <><path d="M8 4v16M16 4v16"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  locate: <><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  layers: <><path d="m12 3 10 6-10 6L2 9Zm-10 11 10 6 10-6M2 19l10 6 10-6" transform="translate(0 -1) scale(1 .9)"/></>,
  more: <><circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none"/></>,
  revert: <><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 2.9L3 13"/></>,
  restore: <><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 2.9L21 13"/></>,
};

export function Icon({ name, size = 16, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}

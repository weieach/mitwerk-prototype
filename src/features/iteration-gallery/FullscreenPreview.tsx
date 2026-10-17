import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FullscreenIcon } from '../../components/PhosphorIcon';
import { galleryTokens as t } from './tokens';

export function FullscreenPreview({ label, ratio, onClose, children, footer }: {
  label: string; ratio: number; onClose: () => void; children: ReactNode; footer: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, []);

  return createPortal(<dialog ref={dialogRef} className="theater-fullscreen" aria-label={label}
    style={{ '--fullscreen-ratio': ratio, '--fullscreen-scrim': t.fullscreen.scrim,
      '--fullscreen-gutter': `${t.fullscreen.gutter}px`, '--fullscreen-close-gap': `${t.fullscreen.closeGap}px`,
      '--fullscreen-close-size': `${t.fullscreen.closeSize}px` } as CSSProperties}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDown={event => event.stopPropagation()}
    onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <button type="button" className="theater-fullscreen-close" aria-label="Close full screen" onClick={onClose}><FullscreenIcon expanded/></button>
    <div className="theater-fullscreen-content">{children}</div>
    <div className="theater-fullscreen-footer">{footer}</div>
  </dialog>, document.body);
}

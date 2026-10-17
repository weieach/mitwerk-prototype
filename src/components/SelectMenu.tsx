import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

export type SelectMenuOption = { value: string; label: string; detail?: string; trailing?: ReactNode; ariaLabel?: string };

const viewportGap = 8;
const preferredHeight = 360;

/**
 * The designed selection overlay shared by every selector. It opens in the top layer next to its trigger,
 * so it clears clipped panels and stays interactive inside modal dialogs such as fullscreen theater.
 */
export function SelectMenu({ id, label, anchor, options, value, minWidth = 0, gap = 0, className = '', align = 'start', closing = false, focusOnOpen = true, activeIndex, onActiveIndexChange, onChoose, onDismiss }: {
  id: string; label: string; anchor: RefObject<HTMLElement | null>; options: readonly SelectMenuOption[]; value: string;
  /** `center` sizes the menu to its options and centers it under the trigger instead of matching the trigger width. */
  align?: 'start' | 'center';
  /** Exit phase: the menu plays its exit transition and ignores input until it unmounts. */
  closing?: boolean;
  className?: string; minWidth?: number; gap?: number; focusOnOpen?: boolean; activeIndex?: number; onActiveIndexChange?: (index: number) => void; onChoose: (value: string) => void; onDismiss: (restoreFocus: boolean) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [internalCursor, setInternalCursor] = useState(() => Math.max(0, options.findIndex(option => option.value === value)));
  const cursor = activeIndex ?? internalCursor;
  const setCursor = (next: number) => { setInternalCursor(next); onActiveIndexChange?.(next); };
  const [bounds, setBounds] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    const menu = list.current!;
    if (!menu.matches(':popover-open')) menu.showPopover();
    const place = () => {
      const rect = anchor.current!.getBoundingClientRect();
      const width = align === 'center' ? Math.min(Math.max(menu.scrollWidth, minWidth), innerWidth - viewportGap * 2) : Math.min(Math.max(rect.width, minWidth), innerWidth - viewportGap * 2);
      const preferredLeft = align === 'center' ? rect.left + rect.width / 2 - width / 2 : rect.left;
      const below = innerHeight - rect.bottom - viewportGap - gap, above = rect.top - viewportGap - gap;
      const flip = below < Math.min(preferredHeight, menu.scrollHeight) && above > below;
      setBounds({ left: Math.max(viewportGap, Math.min(preferredLeft, innerWidth - viewportGap - width)), minWidth: width, maxWidth: innerWidth - viewportGap * 2,
        maxHeight: Math.min(preferredHeight, flip ? above : below), ...(flip ? { bottom: innerHeight - rect.top + gap } : { top: rect.bottom + gap }) });
    };
    place(); addEventListener('resize', place); addEventListener('scroll', place, true);
    return () => { removeEventListener('resize', place); removeEventListener('scroll', place, true); };
  }, [anchor, minWidth, gap, align, options.length]);
  useEffect(() => {
    if (focusOnOpen) list.current?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !anchor.current?.contains(target)) onDismiss(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [anchor, onDismiss, focusOnOpen]);
  useEffect(() => { list.current?.children[cursor]?.scrollIntoView({ block: 'nearest' }); }, [cursor]);
  return <div ref={list} id={id} popover="manual" role="listbox" aria-label={label} aria-activedescendant={`${id}-${cursor}`} tabIndex={-1}
    className={`select-menu ${className}${align === 'center' ? ' is-centered' : ''}${closing ? ' is-closing' : ''}`} inert={closing} style={bounds} onMouseDown={event => { if (!focusOnOpen) event.preventDefault(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onDismiss(true); }
      else if (event.key === 'Tab') onDismiss(false);
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[cursor]) onChoose(options[cursor].value); }
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        setCursor(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, cursor + (event.key === 'ArrowDown' ? 1 : -1))));
      }
    }}>
    {options.map((option, index) => <div id={`${id}-${index}`} key={option.value} role="option" aria-selected={value === option.value} aria-label={option.ariaLabel}
      className={cursor === index ? 'is-highlighted' : ''} onPointerMove={() => setCursor(index)} onClick={() => onChoose(option.value)}>
      <span>{option.label}{option.detail && <span className="row-select-detail"> · {option.detail}</span>}</span>{option.trailing}
    </div>)}
  </div>;
}

/** Reads the shared exit duration so JS unmounting waits for the CSS exit transition. */
export function exitDuration() {
  if (typeof document === 'undefined') return 0;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-exit')) || 0;
}

/** Trigger state for a SelectMenu: arrow keys open it, choosing or Escape returns focus to the trigger. `open` stays true through the exit transition; `closing` marks that phase. */
export function useSelectMenu<T extends HTMLElement>(onChange: (value: string) => void) {
  const trigger = useRef<T>(null);
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = () => { clearTimeout(timer.current); setPhase('open'); };
  const dismiss = useRef((restoreFocus: boolean) => {
    clearTimeout(timer.current);
    setPhase(current => current === 'closed' ? current : 'closing');
    timer.current = setTimeout(() => setPhase(current => current === 'closing' ? 'closed' : current), exitDuration());
    if (restoreFocus) trigger.current?.focus();
  }).current;
  useEffect(() => () => clearTimeout(timer.current), []);
  const choose = (value: string) => { onChange(value); dismiss(true); };
  const triggerProps = {
    ref: trigger, 'aria-haspopup': 'listbox' as const, 'aria-expanded': phase === 'open',
    onClick: () => phase === 'open' ? dismiss(false) : show(),
    onKeyDown: (event: KeyboardEvent) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } },
  };
  return { trigger, open: phase !== 'closed', closing: phase === 'closing', dismiss, choose, triggerProps };
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

export type SelectMenuOption = { value: string; label: string; detail?: string; trailing?: ReactNode; ariaLabel?: string };

const viewportGap = 8;
const preferredHeight = 360;

/**
 * The designed selection overlay shared by every selector. It opens in the top layer next to its trigger,
 * so it clears clipped panels and stays interactive inside modal dialogs such as fullscreen theater.
 */
export function SelectMenu({ id, label, anchor, options, value, minWidth = 0, className = '', onChoose, onDismiss }: {
  id: string; label: string; anchor: RefObject<HTMLElement | null>; options: readonly SelectMenuOption[]; value: string;
  className?: string; minWidth?: number; onChoose: (value: string) => void; onDismiss: (restoreFocus: boolean) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(() => Math.max(0, options.findIndex(option => option.value === value)));
  const [bounds, setBounds] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    const menu = list.current!;
    if (!menu.matches(':popover-open')) menu.showPopover();
    const place = () => {
      const rect = anchor.current!.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, minWidth), innerWidth - viewportGap * 2);
      const below = innerHeight - rect.bottom - viewportGap, above = rect.top - viewportGap;
      const flip = below < Math.min(preferredHeight, menu.scrollHeight) && above > below;
      setBounds({ left: Math.max(viewportGap, Math.min(rect.left, innerWidth - viewportGap - width)), minWidth: width, maxWidth: innerWidth - viewportGap * 2,
        maxHeight: Math.min(preferredHeight, flip ? above : below), ...(flip ? { bottom: innerHeight - rect.top } : { top: rect.bottom }) });
    };
    place(); addEventListener('resize', place); addEventListener('scroll', place, true);
    return () => { removeEventListener('resize', place); removeEventListener('scroll', place, true); };
  }, [anchor, minWidth]);
  useEffect(() => {
    list.current?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !anchor.current?.contains(target)) onDismiss(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [anchor, onDismiss]);
  useEffect(() => { list.current?.children[cursor]?.scrollIntoView({ block: 'nearest' }); }, [cursor]);
  return <div ref={list} id={id} popover="manual" role="listbox" aria-label={label} aria-activedescendant={`${id}-${cursor}`} tabIndex={-1}
    className={`select-menu ${className}`} style={bounds}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onDismiss(true); }
      else if (event.key === 'Tab') onDismiss(false);
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[cursor]) onChoose(options[cursor].value); }
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        setCursor(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      }
    }}>
    {options.map((option, index) => <div id={`${id}-${index}`} key={option.value} role="option" aria-selected={value === option.value} aria-label={option.ariaLabel}
      className={cursor === index ? 'is-highlighted' : ''} onPointerMove={() => setCursor(index)} onClick={() => onChoose(option.value)}>
      <span>{option.label}{option.detail && <span className="row-select-detail"> · {option.detail}</span>}</span>{option.trailing}
    </div>)}
  </div>;
}

/** Trigger state for a SelectMenu: arrow keys open it, choosing or Escape returns focus to the trigger. */
export function useSelectMenu<T extends HTMLElement>(onChange: (value: string) => void) {
  const trigger = useRef<T>(null);
  const [open, setOpen] = useState(false);
  const dismiss = useRef((restoreFocus: boolean) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); }).current;
  const choose = (value: string) => { onChange(value); dismiss(true); };
  const triggerProps = {
    ref: trigger, 'aria-haspopup': 'listbox' as const, 'aria-expanded': open,
    onClick: () => setOpen(current => !current),
    onKeyDown: (event: KeyboardEvent) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } },
  };
  return { trigger, open, dismiss, choose, triggerProps };
}

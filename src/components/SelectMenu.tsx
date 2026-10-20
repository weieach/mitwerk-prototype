import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

/** `group` starts a labeled section when it changes; `selected` lets one menu hold a choice per section. */
export type SelectMenuOption = { value: string; label: string; detail?: string; leading?: ReactNode; trailing?: ReactNode; ariaLabel?: string; group?: string; selected?: boolean };

const viewportGap = 8;
const preferredHeight = 360;

/**
 * The designed selection overlay shared by every selector. It opens in the top layer next to its trigger,
 * so it clears clipped panels and stays interactive inside modal dialogs such as fullscreen theater.
 */
export function SelectMenu({ id, label, anchor, options, value, minWidth = 0, gap = 0, className = '', align = 'start', columns = false, rows = false, focusOnOpen = true, activeIndex, onActiveIndexChange, onChoose, onDismiss }: {
  id: string; label: string; anchor: RefObject<HTMLElement | null>; options: readonly SelectMenuOption[]; value: string;
  className?: string; minWidth?: number; gap?: number; focusOnOpen?: boolean; activeIndex?: number; onActiveIndexChange?: (index: number) => void; onChoose: (value: string) => void; onDismiss: (restoreFocus: boolean) => void;
  /** `center`/`end` size the menu to its options and center it under, or right-align it with, the trigger instead of matching the trigger width. */
  align?: 'start' | 'center' | 'end';
  /** Lay each `group` out as its own column; arrow left/right moves between columns. */
  columns?: boolean;
  /** Lay each group out as a horizontal row; arrow up/down moves between rows. */
  rows?: boolean;
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
      // Re-measure intrinsic width when a responsive grouped menu changes layout.
      if (rows || columns) menu.style.minWidth = `${minWidth}px`;
      const width = align !== 'start' ? Math.min(Math.max(menu.offsetWidth, minWidth), innerWidth - viewportGap * 2) : Math.min(Math.max(rect.width, minWidth), innerWidth - viewportGap * 2);
      const preferredLeft = align === 'center' ? rect.left + rect.width / 2 - width / 2 : align === 'end' ? rect.right - width : rect.left;
      const below = innerHeight - rect.bottom - viewportGap - gap, above = rect.top - viewportGap - gap;
      const flip = below < Math.min(preferredHeight, menu.scrollHeight) && above > below;
      setBounds({ left: Math.max(viewportGap, Math.min(preferredLeft, innerWidth - viewportGap - width)), minWidth: width, maxWidth: innerWidth - viewportGap * 2,
        maxHeight: Math.min(preferredHeight, flip ? above : below), ...(flip ? { bottom: innerHeight - rect.top + gap } : { top: rect.bottom + gap }) });
    };
    place(); addEventListener('resize', place); addEventListener('scroll', place, true);
    // Panels can resize as frames load or panes open without a window resize.
    const resize = new ResizeObserver(place);
    resize.observe(menu);
    for (let element = anchor.current; element; element = element.parentElement) resize.observe(element);
    return () => { resize.disconnect(); removeEventListener('resize', place); removeEventListener('scroll', place, true); };
  }, [anchor, minWidth, gap, align, options.length, columns, rows]);
  useEffect(() => {
    if (focusOnOpen) list.current?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !anchor.current?.contains(target)) onDismiss(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [anchor, onDismiss, focusOnOpen]);
  useEffect(() => { document.getElementById(`${id}-${cursor}`)?.scrollIntoView({ block: 'nearest' }); }, [cursor, id]);
  function renderOption(option: SelectMenuOption, index: number) {
    return <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.selected ?? value === option.value} aria-label={option.ariaLabel ?? (option.group ? `${option.group}: ${option.label}` : undefined)}
      className={cursor === index ? 'is-highlighted' : ''} onPointerMove={() => setCursor(index)} onClick={() => onChoose(option.value)}>
      {option.leading}<span>{option.label}{option.detail && <span className="row-select-detail"> · {option.detail}</span>}</span>{option.trailing}
    </div>;
  }
  return <div ref={list} id={id} popover="manual" role="listbox" aria-label={label} aria-activedescendant={`${id}-${cursor}`} tabIndex={-1}
    className={`select-menu ${className}${align === 'center' ? ' is-centered' : ''}${rows ? ' has-rows' : columns ? ' has-columns' : ''}`} style={bounds} onMouseDown={event => { if (!focusOnOpen) event.preventDefault(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onDismiss(true); }
      else if (event.key === 'Tab') onDismiss(false);
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[cursor]) onChoose(options[cursor].value); }
      else if (rows && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const groups = [...new Set(options.map(option => option.group))];
        const group = options[cursor]?.group;
        const indices = options.flatMap((option, index) => option.group === group ? [index] : []);
        const column = indices.indexOf(cursor);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          setCursor(indices[Math.max(0, Math.min(indices.length - 1, column + (event.key === 'ArrowRight' ? 1 : -1)))] ?? cursor);
        } else {
          const next = groups[groups.indexOf(group) + (event.key === 'ArrowDown' ? 1 : -1)];
          const targets = options.flatMap((option, index) => option.group === next ? [index] : []);
          if (targets.length) setCursor(targets[Math.min(column, targets.length - 1)]);
        }
      }
      else if (columns && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        const groups = [...new Set(options.map(option => option.group))];
        const next = groups[groups.indexOf(options[cursor]?.group) + (event.key === 'ArrowRight' ? 1 : -1)];
        const target = options.findIndex(option => option.group === next);
        if (next !== undefined && target >= 0) setCursor(target);
      }
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        setCursor(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, cursor + (event.key === 'ArrowDown' ? 1 : -1))));
      }
    }}>
    {columns || rows ? [...new Set(options.map(option => option.group))].map(group => <div key={group ?? ''} className="select-menu-column" role="group" aria-label={group}>
      {group && <div className="select-menu-group" aria-hidden="true">{group}</div>}
      {options.map((option, index) => option.group === group && renderOption(option, index))}
    </div>) : options.map((option, index) => <Fragment key={option.value}>
      {option.group && option.group !== options[index - 1]?.group && <div className="select-menu-group" role="presentation" aria-hidden="true">{option.group}</div>}
      {renderOption(option, index)}
    </Fragment>)}
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

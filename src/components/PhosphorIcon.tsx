import '@phosphor-icons/web/regular/style.css';
import '@phosphor-icons/web/fill/style.css';
import type { ComponentType, CSSProperties, HTMLAttributes } from 'react';

export type PhosphorIconProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  size?: number | string;
  weight?: 'regular' | 'fill';
};

/** Shared Phosphor renderer: decorative icons inherit their control’s color and label. */
export function PhosphorIcon({ name, size = 16, weight = 'regular', className = '', style, ...props }: PhosphorIconProps & { name: string }) {
  return <i {...props} aria-hidden="true" className={`ui-icon ${weight === 'fill' ? 'ph-fill' : 'ph'} ph-${name} ${className}`} style={{ '--icon-size': typeof size === 'number' ? `${size}px` : size, ...style } as CSSProperties}/>;
}

export type InterfaceIcon = ComponentType<PhosphorIconProps>;
function icon(name: string): InterfaceIcon {
  return function NamedIcon(props) { return <PhosphorIcon name={name} {...props}/>; };
}

export const ArrowDown = icon('arrow-down');
export const ArrowLeft = icon('arrow-left');
export const ArrowRight = icon('arrow-right');
export const ArrowUp = icon('arrow-up');
export const ArrowUpRight = icon('arrow-up-right');
export const Bell = icon('bell');
export const BookOpen = icon('book-open');
export const Check = icon('check');
export const CheckCheck = icon('checks');
export const ChevronRight = icon('caret-right');
export const ChevronDown = icon('caret-down');
export const CircleCheck = icon('check-circle');
export const Clock3 = icon('clock');
export const FileText = icon('file-text');
export const Folder = icon('folder');
export const Image = icon('image');
export const Layers = icon('stack');
export const LayoutGrid = icon('squares-four');
export const ListTodo = icon('list-checks');
export const LoaderCircle = icon('circle-notch');
export const Maximize2: InterfaceIcon = FullscreenIcon;
export const MessageSquare = icon('chat');
export const MoreHorizontal = icon('dots-three');
export const Minimize2: InterfaceIcon = props => <FullscreenIcon {...props} expanded/>;
export const Moon = icon('moon');
export const PanelLeftOpen = icon('sidebar-simple');
export const Paperclip = icon('paperclip');
export const Plus = icon('plus');
export const Search = icon('magnifying-glass');
export const Settings = icon('gear');
export const SlidersHorizontal = icon('sliders-horizontal');
export const Square = icon('square');
export const SquarePen = icon('note-pencil');
export const Sun = icon('sun');
export const Workflow = icon('flow-arrow');
export const X = icon('x');
export const Archive = icon('archive');
export const RotateCcw = icon('arrow-counter-clockwise');
export const Users = icon('users');

/** Shared fullscreen glyph for panel headers, workspace controls and frame previews. */
export function FullscreenIcon({ expanded = false, style, ...props }: PhosphorIconProps & { expanded?: boolean }) {
  return <PhosphorIcon name={expanded ? 'corners-in' : 'corners-out'} {...props} weight="regular" style={{ ...style, width: 'var(--fullscreen-icon-size)', height: 'var(--fullscreen-icon-size)', fontSize: 'var(--fullscreen-icon-size)' }}/>;
}

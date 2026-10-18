/** Shared text roles for the live type editor. Each role writes CSS variables; the page reads those variables. */

export type TypeFamily = 'sans' | 'mono';

export type TypeDefaults = {
  /** CSS size used until the editor sets a pixel size. May be a clamp or another variable. */
  size: string;
  /** Slider position while the size is still the CSS default. */
  sizePx: number;
  fluid?: boolean;
  weight: number;
  leading: number;
  tracking: string;
  trackingEm: number;
  color: string;
  family: TypeFamily;
  italic: boolean;
  /** Color stays as the component painted it until the editor chooses one. */
  keepColor?: boolean;
};

export type TypeRole = {
  id: string;
  group: string;
  label: string;
  where: string;
  sample: string;
  selector: string;
  /** Color lands here when it should not cover a selected state inside `selector`. */
  colorSelector?: string;
  /** The default size refers to a variable set on a descendant, so it must not be resolved on :root. */
  deferSize?: boolean;
  /**
   * Size updates this existing token instead of `font-size` on `selector`.
   * Use this when the current rule already reads the token, including with !important.
   */
  sizeProperty?: '--control-font-size' | '--sidebar-section-size';
  defaults: TypeDefaults;
};

export type TypeEdit = {
  size?: number;
  weight?: number;
  leading?: number;
  tracking?: number;
  color?: string;
  family?: TypeFamily;
  italic?: boolean;
};

export type TypeOverrides = Record<string, TypeEdit>;

export const typeWeights = [300, 400, 500, 700, 800] as const;

export const typeColors = [
  { id: 'ink', label: 'Ink', value: 'var(--ink)' },
  { id: 'muted', label: 'Muted', value: 'var(--muted)' },
  { id: 'faint', label: 'Faint', value: 'var(--faint)' },
  { id: 'accent', label: 'Accent', value: 'var(--accent)' },
  { id: 'contrast', label: 'Contrast', value: 'var(--contrast)' },
  { id: 'paper', label: 'Paper', value: 'var(--paper)' },
  { id: 'chip', label: 'Chip ink', value: 'var(--capture-chip-ink)' },
] as const;

const controlSize = 'clamp(10px, calc(8px + .21vw), 12px)';

export const typeRoles: TypeRole[] = [
  { id: 'brand', group: 'Workspace', label: 'Wordmark', where: 'MitWerk in the top bar', sample: 'MitWerk', selector: '.mw-topbar .workspace-brand strong', defaults: { size: '14px', sizePx: 14, weight: 500, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'view-link', group: 'Workspace', label: 'View links', where: 'Chat, Version blocks, Idea stream, Live server. The open view keeps its blue.', sample: 'Version blocks', selector: '.workspace-links > button', colorSelector: '.workspace-links > button:not([aria-pressed=true])', defaults: { size: '12px', sizePx: 12, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--muted)', family: 'sans', italic: false } },
  { id: 'panel-title', group: 'Workspace', label: 'Panel title', where: 'Conversation title and the Version blocks pill', sample: 'Version blocks', selector: '.mw-app .workspace-panel-header h2, .workspace .workspace-panel-header .panel-title-pill', defaults: { size: 'var(--chat-title-size)', sizePx: 14, fluid: true, weight: 500, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'view-label', group: 'Workspace', label: 'Gallery / Playback', where: 'The view name beside a panel pill', sample: 'Playback', selector: '.workspace .workspace-panel-header .panel-view-label', defaults: { size: '11px', sizePx: 11, weight: 400, leading: 1.45, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'page-title', group: 'Workspace', label: 'Page title', where: 'Settings and other page headings', sample: 'Settings', selector: '.mw-app :is(.page-title h1, .mw-modal h2)', defaults: { size: 'calc(var(--card-title-size) + 3px)', sizePx: 20, fluid: true, weight: 500, leading: 1.3, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'welcome', group: 'Chat', label: 'Welcome title', where: 'Empty chat heading', sample: 'What would you like to work on?', selector: '.mw-app .new-chat-welcome h1', defaults: { size: 'clamp(24px, 3vw, 32px)', sizePx: 28, fluid: true, weight: 500, leading: 1.25, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'welcome-body', group: 'Chat', label: 'Welcome text', where: 'The line under the empty-chat heading', sample: 'Start with an idea, a question, or a file.', selector: '.mw-app .new-chat-welcome p', defaults: { size: '13px', sizePx: 13, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--muted)', family: 'sans', italic: false } },
  { id: 'message', group: 'Chat', label: 'Message', where: 'Your messages and Mit replies. The size follows the message token.', sample: 'The version is ready to compare.', selector: '.mw-app .message-content', defaults: { size: 'var(--message-font-size)', sizePx: 13, fluid: true, weight: 400, leading: 1.6, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'byline', group: 'Chat', label: 'Byline', where: 'The name above a Mit reply. Role tags keep their own color.', sample: 'Mit', selector: '.mw-app .message-byline > strong', defaults: { size: 'var(--chat-body-size)', sizePx: 13, fluid: true, weight: 500, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'time', group: 'Chat', label: 'Timestamp', where: 'The time under each message', sample: '10:07', selector: '.mw-app .mw-message .message-time', defaults: { size: 'var(--chat-meta-size)', sizePx: 11, fluid: true, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--muted)', family: 'sans', italic: false } },
  { id: 'version-card', group: 'Chat', label: 'Version card', where: 'The version output row in a reply', sample: 'Version 12', selector: '.mw-app .message-version-card', defaults: { size: 'var(--chat-body-size)', sizePx: 13, fluid: true, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false, keepColor: true } },
  { id: 'composer', group: 'Composer', label: 'Composer', where: 'The prompt field', sample: 'Describe the next change', selector: '.mw-app .composer-drawer textarea, .mw-app .mw-composer textarea', defaults: { size: 'var(--chat-body-size)', sizePx: 13, fluid: true, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'drawer-title', group: 'Composer', label: 'To-do heading', where: 'The to-do drawer title', sample: 'To-dos', selector: '.mw-app .composer-drawer-heading', defaults: { size: 'var(--chat-body-size)', sizePx: 13, fluid: true, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'drawer-item', group: 'Composer', label: 'To-do item', where: 'Rows inside the to-do drawer', sample: 'Compare the two frames', selector: '.composer-drawer-content li', defaults: { size: 'var(--chat-body-size)', sizePx: 13, fluid: true, weight: 400, leading: 1.4, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'chip', group: 'Composer', label: 'Capture chip', where: 'Capture setting pills and bucket tags', sample: 'Capturing', selector: '.mw-app .capture-setting-chip, .bucket-tag', defaults: { size: 'var(--capture-chip-font-size)', sizePx: 11, fluid: true, weight: 400, leading: 1.4, tracking: '0em', trackingEm: 0, color: 'var(--capture-chip-ink)', family: 'sans', italic: false } },
  { id: 'control', group: 'Controls', label: 'Controls', where: 'Buttons, selects, and menus. Size also scales row titles that are based on the control size. Selected sidebar items keep their own emphasis.', sample: 'Open frame', selector: ':is(.workspace, .theater-fullscreen) button:not(.station, .branch-count, .idea-fold, .version-heading, .gallery-timeline-push, .theater-resize, .panel-title-pill, .panel-view-label), :is(.workspace, .theater-fullscreen) select, .mw-app .mw-button, .mw-app .mw-segmented > button', defaults: { size: controlSize, sizePx: 12, fluid: true, weight: 400, leading: 1.25, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false, keepColor: true }, sizeProperty: '--control-font-size' },
  { id: 'sidebar-nav', group: 'Sidebar', label: 'Navigation', where: 'Inbox, Settings, and the other sidebar items. The selected item keeps its accent color and medium weight. New chat follows project names.', sample: 'Projects', selector: '.mw-app .mw-sidebar .mw-nav-item:not(.new-chat)', colorSelector: '.mw-app .mw-sidebar .mw-nav-item:not(.active, .new-chat)', defaults: { size: controlSize, sizePx: 12, fluid: true, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--muted)', family: 'sans', italic: false } },
  { id: 'sidebar-project', group: 'Sidebar', label: 'Project names', where: 'Project names and New chat, which share one size token. The open project keeps its accent color.', sample: 'MitWerk product prototype', selector: '.mw-app .sidebar-project, .mw-app .mw-nav-item.new-chat', colorSelector: '.mw-app .sidebar-project:not(.current), .mw-app .mw-nav-item.new-chat', defaults: { size: 'calc((var(--sidebar-project-title-size) + var(--sidebar-chat-title-size)) / 2)', sizePx: 11.5, fluid: true, weight: 400, leading: 1.5, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false }, sizeProperty: '--sidebar-section-size' },
  { id: 'card-title', group: 'Idea stream', label: 'Card title', where: 'Version and idea card titles', sample: 'Implemented landing page layout', selector: '.version-title', defaults: { size: 'var(--card-title-size)', sizePx: 17, fluid: true, weight: 500, leading: 1.2, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'version-number', group: 'Idea stream', label: 'Version number', where: 'V1, V2.1, and the other station numbers. Zoom still scales them.', sample: 'V2.1', selector: '.station-label', deferSize: true, defaults: { size: 'var(--version-label-size, 11px)', sizePx: 11, fluid: true, weight: 500, leading: 1.2, tracking: '0em', trackingEm: 0, color: 'var(--contrast)', family: 'sans', italic: false } },
  { id: 'milestone', group: 'Idea stream', label: 'Milestone', where: 'Milestone notes on the idea stream', sample: 'Shipped the gallery', selector: '.tree-panel .idea-card .idea-milestone', deferSize: true, defaults: { size: 'var(--milestone-font-size, 17px)', sizePx: 17, fluid: true, weight: 400, leading: 1.35, tracking: '0em', trackingEm: 0, color: 'var(--ink)', family: 'sans', italic: false } },
  { id: 'playback-summary', group: 'Version blocks', label: 'Playback summary', where: 'The italic prompt summary under a frame', sample: 'Adjusted the gallery camera', selector: '.workspace .theater-summary', defaults: { size: 'var(--type-control-size)', sizePx: 12, fluid: true, weight: 400, leading: 1.45, tracking: '0em', trackingEm: 0, color: 'var(--muted)', family: 'sans', italic: true } },
];

export const typeRoleGroups = [...new Set(typeRoles.map(role => role.group))];

export function typeRole(id: string) {
  const role = typeRoles.find(item => item.id === id);
  if (!role) throw new Error(`Unknown type role ${id}`);
  return role;
}

const familyValue = (family: TypeFamily) => family === 'mono' ? 'var(--font-code)' : 'var(--sans)';

function splitSelectors(selector: string) {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of selector) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function scope(prefix: string, selector: string) {
  return splitSelectors(selector).map(part => `${prefix} ${part}`).join(', ');
}

/** Beat rules whose :is() list is more specific than the matched argument. */
function qualify(selector: string) {
  return scope('html[data-type-roles]', selector);
}

export function typeRoleStylesheet() {
  const root = typeRoles.flatMap(role => {
    const id = role.id;
    const lines = [
      role.deferSize ? null : `--type-${id}-size: ${role.defaults.size};`,
      `--type-${id}-weight: ${role.defaults.weight};`,
      `--type-${id}-leading: ${role.defaults.leading};`,
      `--type-${id}-tracking: ${role.defaults.tracking};`,
      `--type-${id}-color: ${role.defaults.color};`,
      `--type-${id}-family: ${familyValue(role.defaults.family)};`,
      `--type-${id}-style: ${role.defaults.italic ? 'italic' : 'normal'};`,
    ];
    if (role.sizeProperty) lines.push(`${role.sizeProperty}: var(--type-${id}-size);`);
    return lines.filter((line): line is string => line !== null);
  });
  const rules = typeRoles.map(role => {
    const id = role.id;
    const declarations = [
      `font-family: var(--type-${id}-family)`,
      role.sizeProperty ? null : `font-size: ${role.deferSize ? `var(--type-${id}-size, ${role.defaults.size})` : `var(--type-${id}-size)`}`,
      `font-weight: var(--type-${id}-weight)`,
      `font-style: var(--type-${id}-style)`,
      `line-height: var(--type-${id}-leading)`,
      `letter-spacing: var(--type-${id}-tracking)`,
      role.defaults.keepColor || role.colorSelector ? null : `color: var(--type-${id}-color)`,
    ].filter(line => line !== null);
    const colorRule = role.defaults.keepColor
      ? `${scope(`html[data-type-color~="${id}"]`, role.selector)} { color: var(--type-${id}-color); }\n`
      : role.colorSelector
        ? `${qualify(role.colorSelector)} { color: var(--type-${id}-color); }\n`
        : '';
    return `${qualify(role.selector)} {\n  ${declarations.join(';\n  ')};\n}\n${colorRule}${scope(`html[data-type-focus="${id}"]`, role.selector)} {\n  outline: 1px dashed var(--accent);\n  outline-offset: 2px;\n}`;
  });
  return `:root {\n  ${root.join('\n  ')}\n}\n${rules.join('\n')}\n`;
}

export function roleEdit(overrides: TypeOverrides, id: string): TypeEdit {
  return overrides[id] ?? {};
}

export function resolvedType(role: TypeRole, edit: TypeEdit) {
  return {
    size: edit.size != null ? `${edit.size}px` : role.defaults.size,
    weight: edit.weight ?? role.defaults.weight,
    leading: edit.leading ?? role.defaults.leading,
    tracking: edit.tracking != null ? `${edit.tracking}em` : role.defaults.tracking,
    color: edit.color ?? role.defaults.color,
    family: familyValue(edit.family ?? role.defaults.family),
    style: (edit.italic ?? role.defaults.italic) ? 'italic' : 'normal',
    colorActive: edit.color != null || !role.defaults.keepColor,
  };
}

/** CSS variables for roles that differ from the built-in defaults. */
export function typeOverrideCss(overrides: TypeOverrides) {
  const lines: string[] = [];
  for (const role of typeRoles) {
    const edit = overrides[role.id];
    if (!edit) continue;
    const resolved = resolvedType(role, edit);
    if (edit.size != null) lines.push(`--type-${role.id}-size: ${resolved.size};`);
    if (edit.weight != null) lines.push(`--type-${role.id}-weight: ${resolved.weight};`);
    if (edit.leading != null) lines.push(`--type-${role.id}-leading: ${resolved.leading};`);
    if (edit.tracking != null) lines.push(`--type-${role.id}-tracking: ${resolved.tracking};`);
    if (edit.color != null) lines.push(`--type-${role.id}-color: ${resolved.color};`);
    if (edit.family != null) lines.push(`--type-${role.id}-family: ${resolved.family};`);
    if (edit.italic != null) lines.push(`--type-${role.id}-style: ${resolved.style};`);
  }
  return lines.length ? `:root {\n  ${lines.join('\n  ')}\n}\n` : '';
}

export function shouldApplyTypeEdits(search: string) {
  return new URLSearchParams(search).get('screenshot') !== '1';
}

const storageKey = 'mitwerk-type-studio';

function emptyEdit(edit: TypeEdit) {
  return edit.size == null && edit.weight == null && edit.leading == null && edit.tracking == null && edit.color == null && edit.family == null && edit.italic == null;
}

export function sanitizeTypeOverrides(value: unknown): TypeOverrides {
  if (!value || typeof value !== 'object') return {};
  const next: TypeOverrides = {};
  for (const role of typeRoles) {
    const raw = (value as Record<string, unknown>)[role.id];
    if (!raw || typeof raw !== 'object') continue;
    const source = raw as Record<string, unknown>;
    const edit: TypeEdit = {};
    if (typeof source.size === 'number' && source.size >= 8 && source.size <= 48) edit.size = source.size;
    if (typeof source.weight === 'number' && typeWeights.includes(source.weight as typeof typeWeights[number])) edit.weight = source.weight;
    if (typeof source.leading === 'number' && source.leading >= 0.8 && source.leading <= 2.4) edit.leading = source.leading;
    if (typeof source.tracking === 'number' && source.tracking >= -0.08 && source.tracking <= 0.3) edit.tracking = source.tracking;
    if (typeof source.color === 'string' && source.color.length < 80) edit.color = source.color;
    if (source.family === 'sans' || source.family === 'mono') edit.family = source.family;
    if (typeof source.italic === 'boolean') edit.italic = source.italic;
    if (!emptyEdit(edit)) next[role.id] = edit;
  }
  return next;
}

export function applyTypeOverrides(overrides: TypeOverrides, search = typeof location === 'undefined' ? '' : location.search) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const apply = shouldApplyTypeEdits(search);
  const colored: string[] = [];
  for (const role of typeRoles) {
    const edit = apply ? overrides[role.id] ?? {} : {};
    const set = (suffix: string, value: string | null) => {
      const name = `--type-${role.id}-${suffix}`;
      if (value == null) root.style.removeProperty(name);
      else root.style.setProperty(name, value);
    };
    set('size', edit.size != null ? `${edit.size}px` : null);
    set('weight', edit.weight != null ? String(edit.weight) : null);
    set('leading', edit.leading != null ? String(edit.leading) : null);
    set('tracking', edit.tracking != null ? `${edit.tracking}em` : null);
    set('color', edit.color != null ? edit.color : null);
    set('family', edit.family != null ? familyValue(edit.family) : null);
    set('style', edit.italic != null ? (edit.italic ? 'italic' : 'normal') : null);
    if (edit.color != null && role.defaults.keepColor) colored.push(role.id);
  }
  if (colored.length) root.dataset.typeColor = colored.join(' ');
  else delete root.dataset.typeColor;
}

export function loadTypeOverrides(): TypeOverrides {
  if (typeof localStorage === 'undefined') return {};
  try { return sanitizeTypeOverrides(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
  catch { return {}; }
}

export function saveTypeOverrides(overrides: TypeOverrides) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!Object.keys(overrides).length) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify(overrides));
  } catch { /* The page still shows the current edits. */ }
}

let open = false;
let focus = 'message';
let overrides: TypeOverrides = {};
let snapshot = { open, focus, overrides };
const listeners = new Set<() => void>();

function emit() {
  snapshot = { open, focus, overrides };
  listeners.forEach(listener => listener());
}

function setFocusAttribute(id: string | null) {
  if (typeof document === 'undefined') return;
  if (id) document.documentElement.dataset.typeFocus = id;
  else delete document.documentElement.dataset.typeFocus;
}

export const typeStudio = {
  get: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  openEditor(id = focus) {
    focus = typeRoles.some(role => role.id === id) ? id : focus;
    open = true;
    setFocusAttribute(focus);
    emit();
  },
  close() {
    open = false;
    setFocusAttribute(null);
    emit();
  },
  toggle() {
    if (open) typeStudio.close();
    else typeStudio.openEditor();
  },
  focusRole(id: string) {
    typeStudio.openEditor(id);
  },
  update(id: string, patch: TypeEdit) {
    const edit = sanitizeTypeOverrides({ [id]: { ...overrides[id], ...patch } })[id] ?? {};
    const next = { ...overrides };
    if (emptyEdit(edit)) delete next[id];
    else next[id] = edit;
    overrides = next;
    saveTypeOverrides(overrides);
    applyTypeOverrides(overrides);
    emit();
  },
  clearField(id: string, field: keyof TypeEdit) {
    const edit = { ...overrides[id] };
    delete edit[field];
    const next = { ...overrides };
    if (emptyEdit(edit)) delete next[id];
    else next[id] = edit;
    overrides = next;
    saveTypeOverrides(overrides);
    applyTypeOverrides(overrides);
    emit();
  },
  resetRole(id: string) {
    const next = { ...overrides };
    delete next[id];
    overrides = next;
    saveTypeOverrides(overrides);
    applyTypeOverrides(overrides);
    emit();
  },
  resetAll() {
    overrides = {};
    saveTypeOverrides(overrides);
    applyTypeOverrides(overrides);
    emit();
  },
};

export function installTypeStudio() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById('mitwerk-type-roles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'mitwerk-type-roles';
    document.head.appendChild(style);
  }
  style.textContent = typeRoleStylesheet();
  document.documentElement.dataset.typeRoles = '';
  overrides = loadTypeOverrides();
  snapshot = { open, focus, overrides };
  applyTypeOverrides(overrides);
  if (shouldApplyTypeEdits(location.search) && new URLSearchParams(location.search).get('type') === '1') typeStudio.openEditor();
}

/** Role labels come from the message's author, so multi-Mit chats retain attribution. */
export function mitRole(name: string) { return name.replace(/\bmit\b/gi, '').trim() || 'General'; }
const roleTones = ['dock', 'route', 'assemble', 'handoff', 'pulse', 'misregister'] as const;
export function mitRoleTone(role: string) {
 const key = role.toLowerCase();
 const known: Record<string, typeof roleTones[number]> = { design: 'dock', research: 'route', accessibility: 'assemble' };
 return known[key] ?? roleTones[Array.from(key).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % roleTones.length];
}

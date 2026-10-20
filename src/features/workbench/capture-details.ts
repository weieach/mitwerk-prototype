/** Capture details inferred from the current message, in order of first mention. */
export const captureDetailTokens = { idleMs: 1000, maxKeywords: 2, placeholder: 'overlay, UI state, dark mode...', fallback: 'default view' } as const;

export function inferCaptureDetails(message: string): string {
  if (!message.trim()) return '';
  const matches = message.matchAll(/\b(dark\s+mode|gallery|playback|idea\s+stream|live\s+server)\b/gi);
  const keywords = new Set<string>();
  for (const match of matches) {
    keywords.add(match[0].toLowerCase().replace(/\s+/g, ' '));
    if (keywords.size === captureDetailTokens.maxKeywords) break;
  }
  return [...keywords].join(' and ') || captureDetailTokens.fallback;
}

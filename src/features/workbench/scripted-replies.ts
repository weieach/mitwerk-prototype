import type { Capture } from '../iteration-gallery/model.ts';
import type { Message } from './model.ts';

export const chatWidthPrompt = 'Increase the max width of chat panel';

/** A session-only demo result, separate from the saved capture/Git history. */
export function scriptedReply(text: string, captures: Capture[], previous: Message[] = []) {
  if (text !== chatWidthPrompt) return null;
  const latest = [...captures].sort((a, b) => a.timestamp - b.timestamp).at(-1);
  const version = Math.max(0, ...captures.filter(frame => frame.kind === 'push').map(frame => frame.number ?? 0),
    ...previous.filter(message => message.demoAction === 'refresh-live').map(message => message.versionOutput?.version ?? 0)) + 1;
  const prompt = Math.max(0, ...captures.filter(frame => frame.kind === 'prompt').map(frame => frame.number ?? 0),
    ...previous.filter(message => message.demoAction === 'refresh-live').map(message => message.versionOutput?.prompt ?? 0)) + 1;
  return {
    demoAction: 'refresh-live' as const,
    text: `Increased the chat panel’s maximum width so there’s more room for longer messages and version previews. The panel still resizes with the workspace, and fullscreen conversations stay centered.\n\nPushed the update as version ${version}. The new version is ready to review below.`,
    versionOutput: { version, prompt, imageUrl: latest?.url ?? 'examples/iteration-preview.png', inviteMilestone: false },
  };
}

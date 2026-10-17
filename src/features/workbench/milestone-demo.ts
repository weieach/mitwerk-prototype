import type { Message } from './model';

/** Opt-in preview (`?demo=milestone`): appends one sample Mit reply with a version output so the milestone invitation can be styled without saved captures or a live server. Never persisted. */
export const milestoneDemoEnabled = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === 'milestone';

export const milestoneDemoMessage: Message = {
  id: 'demo-milestone',
  role: 'mit',
  name: 'Design Mit',
  time: '14:05',
  text: 'The date ruler now sits under the versions, and hovering a frame lifts it with its summary. Everything you listed for the album is in place.',
  versionOutput: { version: 41, prompt: 320, imageUrl: 'examples/iteration-preview.png', frameId: 'demo-milestone-frame' },
};

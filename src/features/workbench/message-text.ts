/** Legacy annotation envelopes stored reference URLs inline; keep those out of chat prose. */
export function visibleMessageText(text: string): string {
  return text.replace(/^\[Frame annotation [^\]\n]+\]\r?\n(?:Prompt|Frame) #[^\n]+\r?\n[\s\S]*?\r?\nReference: [^\n]+\r?\n\r?\n/, '');
}

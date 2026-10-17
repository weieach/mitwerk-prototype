/** Fenced plain text keeps Markdown, links and embedded headings verbatim. */
export function parsePromptLog(markdown) {
  const prompts = new Map();
  const entries = /^## Prompt #(\d+)\n\n(`{3,})text\n([\s\S]*?)\n\2(?=\n|$)/gm;
  for (const match of markdown.matchAll(entries)) prompts.set(Number(match[1]), match[3]);
  return prompts;
}

export function appendPromptEntry(markdown, number, text) {
  if (!Number.isSafeInteger(number) || number < 1 || !text.trim()) throw new Error('A prompt counter and full text are required.');
  const existing = parsePromptLog(markdown).get(number);
  if (existing === text) return markdown;
  if (existing !== undefined) throw new Error(`Prompt #${number} already has different text; keep the original entry.`);
  const longest = Math.max(2, ...Array.from(text.matchAll(/`+/g), match => match[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${markdown}${markdown.endsWith('\n') ? '' : '\n'}\n## Prompt #${number}\n\n${fence}text\n${text}\n${fence}\n`;
}

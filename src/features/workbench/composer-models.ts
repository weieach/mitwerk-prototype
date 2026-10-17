/** Verified against provider catalogs on 2026-10-17. UI selections; no API routing implied. */
export const composerModels = [
  { value: 'gpt-6-astra', label: 'GPT-6 Astra', detail: 'OpenAI' },
  { value: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', detail: 'OpenAI' },
  { value: 'gpt-6-luna', label: 'GPT-6 Luna', detail: 'OpenAI' },
  { value: 'claude-fable-5.1', label: 'Claude Fable 5.1', detail: 'Anthropic' },
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', detail: 'Google' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', detail: 'Google' },
] as const;
export const composerModelSources = [
  'https://developers.openai.com/api/docs/models',
  'https://www.anthropic.com/claude/fable',
  'https://ai.google.dev/gemini-api/docs/models',
];

import { runtimeKeyMessage } from './runtime-messages.mjs';

/** Run before app modules: each live preview starts fresh without changing the host's data. */
if (window.self !== window.top && new URLSearchParams(location.search).get('livePreview') === '1') {
  const storage = (): Storage => {
    const values = new Map<string, string>();
    return { get length() { return values.size; }, clear: () => values.clear(),
      getItem: key => values.get(String(key)) ?? null, key: index => [...values.keys()][index] ?? null,
      removeItem: key => { values.delete(String(key)); }, setItem: (key, value) => { values.set(String(key), String(value)); } };
  };
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { value: storage() });
  localStorage.setItem('mitwerk-theme', new URLSearchParams(location.search).get('theme') === 'light' ? 'light' : 'dark');
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!['GET', 'HEAD'].includes(method)) return Promise.reject(new Error('Live preview changes stay in this preview.'));
    return fetchOriginal(input, init);
  };
  // Tab / Escape inside the preview let the host leave full screen (the host page never sees these keys).
  window.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Escape') window.parent.postMessage({ type: runtimeKeyMessage, key: event.key }, '*');
  }, true);
}

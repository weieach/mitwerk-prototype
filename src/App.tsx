import { useState } from 'react';

type Status =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'ok'; message: string; detail?: string }
  | { kind: 'error'; message: string; detail?: string };

const DEFAULT_URL =
  'https://www.figma.com/design/30KWPrZ48jBMqozHlwSarX/Test--agent-annotation?node-id=0-1';

export default function App() {
  const [fileUrl, setFileUrl] = useState(DEFAULT_URL);
  const [frameName, setFrameName] = useState('Test frame');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const working = status.kind === 'working';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ kind: 'working' });

    try {
      const response = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, frameName }),
      });
      const result = await response.json();

      const detail =
        typeof result.detail === 'string'
          ? result.detail
          : result.detail
            ? JSON.stringify(result.detail, null, 2)
            : undefined;

      setStatus({
        kind: result.ok ? 'ok' : 'error',
        message: result.message,
        detail,
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: 'Could not reach the local server. Is `npm run dev` still running?',
        detail: String(err),
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Mitwerk — review comment spike
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Pins one fixed sample comment to a named frame, through the Figma REST API.
          Proving this write is the point; everything else in the product depends on it.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="fileUrl" className="block text-sm font-medium text-neutral-800">
            Figma file URL
          </label>
          <input
            id="fileUrl"
            type="text"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://www.figma.com/design/…"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
          <p className="text-xs text-neutral-500">Paste the full URL from your browser's address bar.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="frameName" className="block text-sm font-medium text-neutral-800">
            Frame name
          </label>
          <input
            id="frameName"
            type="text"
            value={frameName}
            onChange={(e) => setFrameName(e.target.value)}
            placeholder="Test frame"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
        </div>

        <button
          type="submit"
          disabled={working}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {working ? 'Posting…' : 'Post comment to frame'}
        </button>
      </form>

      {status.kind !== 'idle' && status.kind !== 'working' && (
        <section
          className={`rounded-md border px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border-green-300 bg-green-50 text-green-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          <p className="font-medium">{status.message}</p>
          {status.detail && (
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs opacity-80">
              {status.detail}
            </pre>
          )}
        </section>
      )}
    </main>
  );
}

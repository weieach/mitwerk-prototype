import { useEffect, useState } from 'react';

type Status =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'ok'; message: string; detail?: string }
  | { kind: 'error'; message: string; detail?: string };

type Auth = {
  oauthConfigured: boolean;
  connected: boolean;
  user: { handle?: string; email?: string; imgUrl?: string } | null;
};

const DEFAULT_URL =
  'https://www.figma.com/design/30KWPrZ48jBMqozHlwSarX/Test--agent-annotation?node-id=0-1';

export default function App() {
  const [fileUrl, setFileUrl] = useState(DEFAULT_URL);
  const [frameName, setFrameName] = useState('Test frame');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [auth, setAuth] = useState<Auth | null>(null);

  // Surface an OAuth failure that came back as a query parameter, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) setStatus({ kind: 'error', message: authError });
    if (authError || params.get('connected')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then(setAuth)
      .catch(() => setAuth(null));
  }, []);

  const working = status.kind === 'working';
  // With OAuth configured, a visitor must connect before they can post.
  const needsConnection = auth?.oauthConfigured === true && auth.connected === false;

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

      setStatus({ kind: result.ok ? 'ok' : 'error', message: result.message, detail });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: 'Could not reach the server. Is it still running?',
        detail: String(err),
      });
    }
  }

  async function disconnect() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuth((a) => (a ? { ...a, connected: false, user: null } : a));
    setStatus({ kind: 'idle' });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Mitwerk — review comment spike
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Pins one fixed sample comment to a named frame, through the Figma REST API. Connect your
          own Figma account and try it on your own file.
        </p>
      </header>

      {/* Connection state */}
      {auth?.oauthConfigured && (
        <section className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          {auth.connected ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-neutral-700">
                {auth.user?.imgUrl && (
                  <img src={auth.user.imgUrl} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span>
                  Connected as <strong className="font-medium">{auth.user?.handle ?? 'Figma user'}</strong>
                </span>
              </div>
              <button
                onClick={disconnect}
                className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-700">
                Connect Figma to comment on your own files. Comments post as you.
              </p>
              <a
                href="/api/auth/login"
                className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                Connect Figma
              </a>
            </div>
          )}
        </section>
      )}

      {auth && !auth.oauthConfigured && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Running with a server-side personal access token. Set <code>FIGMA_CLIENT_ID</code> and{' '}
          <code>FIGMA_CLIENT_SECRET</code> to let other people connect their own accounts.
        </p>
      )}

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
          <p className="text-xs text-neutral-500">
            Copy the link with the frame selected — that makes the lookup much cheaper.
          </p>
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
          disabled={working || needsConnection}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {working ? 'Posting…' : needsConnection ? 'Connect Figma first' : 'Post comment to frame'}
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

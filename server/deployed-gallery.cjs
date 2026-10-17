exports.createHandler = manifestUrl => async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  try {
    const response = await fetch(manifestUrl, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error('Catalog unavailable');
    const catalog = await response.json();
    if (!Array.isArray(catalog.frames) || !catalog.frames.length) throw new Error('Invalid catalog');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(catalog));
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'The saved-frame catalog could not be loaded. Please retry.' }));
  }
};

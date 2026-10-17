# Embedding captured codebases

Each push is a commit recorded in `data/push-shas.json`; its tree is staged on demand with `git archive` (or a GitHub tarball when the commit is not local): `src/`, `package.json`, no `node_modules`, no built `dist/`. The former `[ver capture] codebase/` copies are no longer used. They are the right raw material for a Figma-like clickable embed, but they are not embeddable until something installs and builds (or compiles) them.

The Iteration Gallery today is the other path: static PNGs in theater view. Resizing does not reflow the old UI. The original proposal wanted pause-and-interact in the live prototype at that moment.

## Screenshots (what you have now)

Theater shows a PNG. Fast, cheap, no extra security surface. Users cannot scroll or click the historical UI. Viewport presets only crop or frame the image.

## Pre-build each snapshot (most like Figma)

On push, run `npm ci` and `vite build` in that archive (or a copy) and host `dist/` at a URL such as `/embeds/push-9/`. The site iframes it with `sandbox="allow-scripts"`. Visitors get a real app immediately. Cost is a build per version, a correct Vite `base` path, and isolated `localStorage` so versions do not share the graph.

## Run the source in the browser (WebContainers / Sandpack)

The iframe boots Vite from the captured files. No pre-build farm. Closest to “this is the repo.” First load is slower and heavier. Still sandbox the frame and strip localhost-only hooks (port 5173, graph persist, screenshot watchers).

## Live server per version (local demo only)

A host maps `/v/push-9` to that folder and runs `npm run dev`. Fine on your machine; a poor public design. Every snapshot wants port 5173, and you would be running historical Node on a server.

## Comparison

| Approach | Clickable? | Feels like Figma? | Cost | Good for |
|---|---|---|---|---|
| PNG theater | No | Filmstrip only | Almost none | Album, playback |
| Pre-build + iframe | Yes | Yes | Build + host per push | A real site embed |
| WebContainer / Sandpack | Yes | Yes, plus live source | Heavy first load | Demos from the raw archive |
| Dev server per folder | Yes | Local only | Processes + ports | Local clicking, not visitors |

A product-shaped mix is PNGs as the flipbook, then swap the theater image for an iframe of the matching **push** archive when someone pauses or opens a version. Prompt frames have no codebase unless you also archive on prompt.

## Caveats for any live embed

- Isolate origin or storage keys. The graph uses `localStorage` and `/__mitwerk/graph`; version 9 and 10 will otherwise share stations.
- Treat historical JS as untrusted: iframe sandbox, no parent cookies, no shared storage.
- Archives omit `node_modules`. The host must install or cache dependencies.
- Do not point an iframe at `http://localhost:5173`. That is only the current tree.

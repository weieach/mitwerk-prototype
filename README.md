# Mitwerk

The active prototype now follows **Idea 2: visual iteration history**. Run `npm run dev` and open `http://localhost:5173/` for the Iteration Gallery and Version stream. The gallery reads PNGs in `[frame capture] screenshots/`, provides isometric browsing and theater playback, and includes its capture assets in `npm run build`.

See [Idea 2](docs/idea-2-project-proposal.md), [gallery implementation](docs/iteration-gallery.md), and [shared design rules](docs/design-system-rules.md). Run `npm test` for the graph and gallery suites. The earlier review prototype described below is retained as historical context under `archive/review-comment-spike/`.

The version stream shows Commit history and hides the Test visual / Commit history dropdown. Press `T` to reveal that dropdown and switch the panel to Test visual.

## Earlier proposal

An agentic project management platform for running design reviews and gathering feedback — with AI
agents and remote colleagues — to cut the delay and coordination friction of asynchronous,
distributed review.

Research and prototyping repo for the capstone.

## Contents

- [`docs/project-proposal.md`](docs/project-proposal.md) — the project proposal, transcribed from the
  *Capstone research* Figma board.
- The review-comment MVP (below).

## MVP V1

A local web app that takes a Figma design-file URL and a frame name, resolves that name to a node via
the Figma REST API, and pins a sample comment to it.

Written against REST rather than the Figma MCP server, which admits only clients on Figma's MCP
Catalog — annotations remain unreachable to a custom client; comments do not.

```bash
npm install
cp .env.local.example .env.local   # then fill it in
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | App + API on Vite's dev server |
| `npm run build && npm start` | Production build behind the standalone Node server |
| `npm run spike` | Post a comment from the command line, no UI |
| `npm run bench` | Measure the frame-lookup strategies against a file |

## Connecting Figma

Two ways, set in `.env.local`:

**OAuth (multi-user, works hosted).** Create an app at
[figma.com/developers/apps](https://www.figma.com/developers/apps) — self-serve, no approval — and set
`FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`, and `FIGMA_REDIRECT_URI`. Any Figma user can then connect
their own account and comment on their own files. Scopes requested: `file_content:read`,
`file_comments:write`, `current_user:read`. Comments post as the connected user.

**Personal access token (just you, local).** Set `FIGMA_TOKEN`. Used automatically when the OAuth
values are blank.

## Frame lookup, and what it costs

Resolving a user-typed frame name to a node id is the expensive part. The naive approach —
`GET /v1/files/{key}` and walk the whole document — returns the entire file on every submit. Fine for
a test file, potentially megabytes for a real one.

`resolveFrame()` in [`server/figmaRest.mjs`](server/figmaRest.mjs) escalates instead:

1. **node-hint** — if the URL's `node-id` points at a frame, that is the answer, in one small call.
   Ids starting `0:` are skipped: a plain file link carries `node-id=0-1`, the first page, never a frame.
2. **depth=2** — every page plus its top-level objects and nothing deeper. Most named frames are
   top-level, so this usually ends here.
3. **full document** — only for frames nested inside other frames.

Responses are cached for 5 minutes, keyed by URL *and* a fingerprint of the caller's token so one
user's cached file content can never be served to another.

### Measured

On the one-frame test file, both paths resolve in a single request:

| Link shape | Resolved by | Downloaded |
|---|---|---|
| `?node-id=1-2` (frame selected) | `node-hint` | 1.4 KB |
| `?node-id=0-1` (plain file link) | `depth2` | 2.4 KB |

An earlier version also re-fetched the hinted *page* scoped to `depth=2`. Benchmarking removed it: it
spent two round trips to obtain what plain `depth=2` returns in one, and fired on the common case.

**This has not been measured on a large file.** On the test file all strategies are the same 2.4 KB,
so the ladder's value is currently reasoned rather than demonstrated. Run `npm run bench -- "<url>"`
against a real production file before trusting it — that is where they diverge, and where a
many-paged file might justify reintroducing page scoping.

The cache also only helps within a running server; each `npm run spike` is a fresh process.

## Known limits

- Sessions are held in memory, so a server restart signs everyone out, and it will not survive being
  run as more than one process. Replace before this holds anything you would mind losing.
- Hosting makes you custodian of other people's Figma tokens. That is a bigger responsibility than
  the deployment work.
- Comments post as the connected user, so there is no agent identity. A dedicated Figma account is
  the usual workaround; Figma's comment object requires a `user` and has no app identity.

## Source of record

Research board (FigJam): [Capstone research](https://www.figma.com/board/im0O0k4DLrdOmlk5NJjMaq/Capstone-research?node-id=0-1)


### Vercel deployment

Live prototype: https://mitwerk-prototype.vercel.app

Deploy the current working copy without committing or pushing:

```sh
npx vercel link --project mitwerk-prototype
npm run build:vercel
npx vercel deploy --prebuilt --prod
```

Prefer `npm run deploy:vercel` for subsequent releases: it builds locally, checks every frame and reference against its original SHA-256 hash, deploys the prebuilt output, then checks every live image. Run `npm run verify:gallery -- https://mitwerk-prototype.vercel.app` independently to audit production. Production builds fail if the capture catalog is empty, preventing a Git-only checkout from silently replacing the gallery with zero frames. New captures still require a rebuild and deployment.

Frame storage choices:

| Approach | What changes | Tradeoff |
| --- | --- | --- |
| Local prebuilt deployment (current) | Upload the compiled gallery with each release | Simplest immediate solution; depends on this machine and redeployment |
| Images in Git | Remove the capture-directory ignore rule and commit all frames | Fresh checkouts can build; growing binary history increases clone size; each frame needs a commit/deploy |
| Vercel Blob + JSON manifest (recommended next) | Upload immutable images, publish the manifest after upload verification, load it from the shared gallery | Independent of code releases; storage/transfer charges; requires a configured store and authenticated uploader |
| Supabase Storage + Postgres | Store image bytes in Storage and frame metadata in a table | Useful for querying, permissions and future shared data; more integration work |

Keep image bytes in object storage when using a database; store stable frame IDs, object keys, hashes, dimensions, prompt/push numbers, branch and timestamps in the database. Preserve current capture IDs so annotations and history links survive migration. External image delivery must allow cross-origin texture loading for the 3D gallery. Archived prototypes must retain frozen catalogs while sharing immutable image objects. Publish catalogs only after all referenced objects are verified, and keep originals backed up independently. Do not put storage write credentials in the browser.

Provider references: [Vercel Blob](https://vercel.com/docs/vercel-blob), [Supabase Storage](https://supabase.com/docs/guides/storage), [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github). Storage migration is a proposal; the current deployment still bundles images.

The Vercel build runs locally because capture images, Git history and saved codebases are local inputs. It packages the current UI, gallery assets and every available archived prototype into ignored `.vercel/output/`, with a small read-only API for **Enter prototype**. Only compiled output is uploaded; source archives and local credentials are not deployed. Rebuild before each deployment. Missing historical archives remain unavailable, as they do locally. Notes, to-dos and test graphs remain browser-local; this deployment does not add shared storage or a live agent backend.

### Archived prototype behavior

On a theater push frame, **Enter prototype** loads that push's commit (from `data/push-shas.json`) out of Git on demand, builds it, and embeds it in the frame. Local Git objects are used first; commits missing from the clone are downloaded from GitHub when `GITHUB_TOKEN` is set, since the repository is private. Push targets occupy timeline separators, including an extra target beyond the latest block. Targets without a push in the chosen date range are unavailable.

The local Vite server and `npm start` expose the prototype service on port 5173. A plain static-file host cannot build pushes. Builds use installed host dependencies (no automatic installs), ignore archived Vite configs/scripts/hooks and cache output in ignored `.mitwerk-prototypes/`. Captures are frozen at the push timestamp. The iframe has isolated in-memory storage and no access to live project APIs; closing it discards interaction state. Historical code requiring unavailable dependencies reports a build error rather than opening the current site.

Archived previews also use the push timestamp as their current date, so an old “Last 7 days” filter still shows that snapshot's frames. If a previously deployed archive opens with zero frames, choosing All time is a temporary workaround; rebuild with `npm run build:vercel` and redeploy to apply the date fix. The current app chooses the smallest range containing at least ten versions and preserves manually selected ranges.

# Mitwerk

An agentic project management platform for running design reviews and gathering feedback — with AI
agents and remote colleagues — to cut the delay and coordination friction of asynchronous,
distributed review.

Research and prototyping repo for the capstone.

## Contents

- [`docs/project-proposal.md`](docs/project-proposal.md) — the project proposal, transcribed from the
  *Capstone research* Figma board: concept, context chain, preliminary research question, target
  audience, and work plan.
- The annotation MVP (below) — a spike proving the proposal's core technical bet.

## The annotation MVP

The proposal rests on one line: *"Read Figma / coding files — having agent directly annotate inside
figma files."* Everything else is conventional app-building; this is the part that might not work.
So the first build proves exactly that, and nothing more: given a Figma design-file URL and a frame
name, write a fixed sample annotation onto that frame.

**Status: the write works.** Confirmed on frame `Test frame` in the test file, read back from the node.

```bash
npm install
npm run dev
```

Then open the printed localhost URL, paste a Figma **design** file URL and a frame name, and submit.
To prove the path without the UI:

```bash
npm run spike
```

### How it works

`use_figma` is a deterministic MCP tool — it takes `{fileKey, code, description}` and runs JavaScript
against the Figma Plugin API. No model sits in the write path.

- `server/annotate.mjs` — builds the Plugin API script and maps failures to messages
- `server/mcpClient.mjs` — connects to the MCP server (local or remote)
- `server/figmaAuth.mjs` — OAuth for the remote server
- `server/figmaUrl.mjs` — parses the file key out of a pasted URL
- `vite.config.ts` — mounts `POST /api/annotate` on Vite's dev server, so the MCP client runs in Node
  and the token never reaches the browser, without a second process

### Transport, and a constraint worth knowing

Set with `MITWERK_MCP=local|remote` (default `local`).

**local** — `http://127.0.0.1:3845/mcp`, served by the Figma desktop app. Requires the local MCP
server to be enabled in Figma's preferences. No authentication.

**remote** — `https://mcp.figma.com/mcp`. The OAuth implementation is complete and correct, but
**currently unusable for this app**: Figma's docs state that *"Only clients listed in the Figma MCP
Catalog can connect to the Figma MCP Server,"* and the advertised dynamic-registration endpoint
returns `403 Forbidden`. There is a waitlist for new clients.

That constraint is strategic, not cosmetic: until this app is catalog-listed, it can only run on a
machine with Figma desktop open, so it cannot become the hosted, remote-collaboration tool the
proposal describes. Worth resolving early — see the alternatives noted in the project docs.

## Source of record

Research board (FigJam): [Capstone research](https://www.figma.com/board/im0O0k4DLrdOmlk5NJjMaq/Capstone-research?node-id=0-1)

Sections beyond the proposal — *Competitive analysis*, *Primary research*, *Research plan*,
*Idea Cloud*, *Style+Inspiration* — are not yet transcribed.

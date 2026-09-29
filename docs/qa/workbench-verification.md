# Workbench verification

Branch: `redesign/iteration-gallery`. Local prototype: http://localhost:5173/.

## Confirmed delivery
- Persistent navigation; projects, task list, Inbox, Mits, Library and settings surfaces.
- Independent task/subtask dialogs; Builder means creator.
- All / Mits / Co-workers Inbox filters; human messages may be unassigned.
- Persistent Input / Output cards; document/image/prototype readers; close, resize and expand controls.
- Existing reading workspace preserved at `?view=history` and embedded under Iteration history.
- MitWerk palette from the supplied HTML design system, incumbent Neurial Grotesk typography.

## Verification
- `npm run build`: passed (existing Three.js history bundle causes a size warning).
- `npm test`: 99 passed, zero failed.
- Impeccable mechanical detector: no findings.
- Desktop 1440×960 and narrow 390×844 inspected; no horizontal page overflow at 390px.
- Opened/closed document and prototype attachments; verified draft text survived.
- Created “Review profile labels” as a subtask, confirmed copied Input and independent conversation, sent a simulated request, and marked the task complete.
- Verified Co-workers filter returns the unassigned human conversation.
- Expanded iteration history and verified Commit history mode loaded 26 real Git commit nodes. The gallery initially had no saved frames from this clone; this turn's progress capture adds a local frame.
- Independent review found an Inbox breadcrumb route issue; fixed and reviewer confirmed resolved, ship.

## Boundaries
Messages and responses are local simulations. No AI or colleague backend is connected. Tasks, text drafts, project name and instructions persist in browser local storage; uploaded files last for this session. History is workspace-level and is not yet linked per sample output. No deployment, commit or push was performed.

## Evidence
- `chat-desktop.png`
- `chat-reader-desktop.png`
- `chat-mobile.png`
- `reader-mobile.png`
- `history-desktop.png`

## Collaboration and Mit configuration — 2026-09-28

- Home now aggregates cross-project attention; Projects is an independent searchable project directory with scoped tasks, instructions and members.
- Browser verified: Co-workers search → Nicole message → file-only send → explicitly simulated incoming attachment → reader → create project with Nicole preselected → project directory.
- Browser verified: Create Content partner → save identity/instructions/skill → start task in Reading experience review → sample reply includes saved configuration → customize/rename Content Mit → duplicate-name validation → discard unsaved changes.
- Desktop 1440×960 and mobile 390×844 captures saved in this folder. Mobile colleagues and Mit forms have document scrollWidth 390.
- Independent reviewer found task-modal project selection leaking into the underlying project page. Fixed using separate taskProjectId modal state. Reviewer could not complete its final response due to account usage limit; remaining checks performed locally.
- Added migration/isolation and Mit persistence/rename tests. 103 tests pass. Production build passes with the existing large bundle warning.
- Limitation: human replies and AI replies are explicit local simulations; selected tools and review rules are configuration only. Uploaded attachments remain session-only; existing workspace assets and messages persist.

## Project cards, compact reader, and mentions — 2026-09-29

Build and 106 tests pass. Browser access recovered after the earlier usage-limit rejection. Verified @Research keyboard selection and sending, Research Mit appearing alongside Content Mit in project Co-workers, project card archive → Archived → Restore, and switching HTML to Design notes with the Reading resource dropdown in the title row. Screenshots: mit-mention-menu.png, projects-card-grid.png, reader-resource-dropdown.png. No actual external messages or invitations sent.

Unified reading toolbar: production build passed. Browser verified Preview/Iteration history switching at 1280px. At 390px, toolbarRows=0, headerHeight=52px, document width=390px; mode dropdown visible. Browser usage block cleared on continuation; desktop/mobile captures saved.

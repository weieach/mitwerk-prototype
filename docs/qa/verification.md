

## Personal workspace navigation — 2026-09-29

- Build and all 106 existing tests passed after the implementation.
- Browser verified expanded project task links, task navigation, and removal of upper Projects and Co-workers navigation. Evidence: `project-task-sidebar.png`.
- History notice replaced by an information control. Embedded file-selector padding now overrides application select padding; final visual verification of the loaded history selector was inconclusive after browser navigation changed.
- Human collaboration entry points removed; legacy saved records retained. Current Home screenshot: `personal-workspace-navigation.png`.


## Flat task hierarchy — 2026-09-29
- Build and 107 tests passed, including preservation and idempotence of legacy parent-link removal.
- Browser verified project task links use equal indentation and a former child opens directly without parent navigation or subtask creation. Screenshot: `flat-tasks.png`.
- Restored stopped localhost:5173 development server before checking the updated page.


## Navigation toggle and task options — 2026-09-29
- Production build passed.
- Browser checked fully hidden desktop navigation, full narrow-screen drawer with labelled destinations, and the task-header three-dot menu opening the matching Mit profile.
- Evidence: `navigation-task-options.png`.


## Sidebar inbox and New chat — 2026-09-30
- Build passed. Browser verified the bell toggles grouped sidebar conversation previews, selecting a preview opens its corresponding task, and New chat creates an independent empty conversation with composer focus.
- Saved evidence: `sidebar-inbox.png`. Reference images stored in `visual_ref` under prompt #162.


## Compact sidebar inbox — 2026-09-30
- Build passed; browser screenshot confirms one title line and one truncated message line per item, with no standalone metadata row.
- Evidence: `compact-sidebar-inbox.png`.


## Immersive New chat — 2026-09-30
- Build passed. Browser verified focused composer, welcome text and absence of the task header, date divider and context rail on a fresh New chat. Screenshot: `new-chat-launch.png`.
- Existing task layout remains conditional on a non-launch conversation; sending updates the title and message list, exiting launch mode.


## Inline task status — 2026-09-30
- Build passed. Browser verified expand, selected indicator, collapse on selection and return of focus to the trigger without changing the saved status.
- Screenshot: `inline-task-status.png`. Reduced-motion styles disable transitions.


## Reader resource icons — 2026-09-30
- Build passed. Browser verified prototype opens Iteration Gallery and Version stream directly, without Preview mode, and icon selection switches to the document reader with active state updated.
- Screenshot: `reader-resource-icons.png`; icons expose names through title and accessible labels.

## Prompt 168: Responsive conversation header
- Verified localhost:5173 in browser: title and metadata share one row; expanded sidebar narrows the conversation and collapses metadata to icons plus participant count; collapsed sidebar restores status and Mit labels.
- Saved conversation-header.png. Production build and git diff --check passed.

## Prompt 169: Prototype resource first
- Browser verified Profile panel first, followed by Component brief, Information architecture, Design notes. Gallery and version stream load correctly.
- Production build and git diff --check passed. Screenshot: reader-prototype-first.png.

## Prompt 170: Image gallery
- Dedicated image icons replace thumbnails. Two or more images combine into a counted gallery entry.
- Browser verified with a session-only local QA image: gallery entry, thumbnail grid, opening an image, and All images return. Removed the queued test attachment without sending a message.
- Production build and git diff --check passed. Screenshot: image-gallery.png.

## Prompt 171: Project asset collections
- Browser verified Library only contains Skills/Plugins; project Assets shows task collections and expands to files; selecting a file opens the reader with project-scoped resources.
- Production build and git diff --check passed. Screenshot: project-asset-collections.png.

## Prompt 172: Composer and attention emphasis
- Browser verified 18px composer corners on New chat and blue attention heading with count badge on Home.
- Production build and git diff --check passed. Screenshots: rounded-composer.png, attention-emphasis.png.

## Prompt 173: Collapsible workspace bar
- Browser verified hide and restore actions with focus transferred to the corresponding toggle; compact 42px reader header leaves more space for the gallery.
- Production build and git diff --check passed. Screenshot: compact-reader-chrome.png.

## Prompt 174: Restore attention heading
- Reverted blue banner and count badge to original section heading. Browser screenshot verified; git diff --check passed.

## Prompt 175: Remove date separator
- Removed top conversation date banner and its CSS. Browser verified first message starts directly below the heading; message timestamps remain. git diff --check passed.

## Prompt 176: Project identity colors
- Used approved brand palette tokens in a shared project color helper for Home, sidebar, project covers and detail folder marks. Browser verified blue/green/purple distinction. Production build and git diff --check passed.

## Prompt 177: Draggable task cards
- Browser verified pointer drag To do → In progress updates column counts, Alt+Left restores To do, and subsequent card click opens the conversation. Fixed click suppression cleanup on drop when the dragged element unmounts. Test task status restored.
- Production build and git diff --check passed. Screenshot: draggable-kanban.png.

## Prompt 178: Yellow / green / purple projects
- Shared project palette now cycles Route, Assemble and Misregister. Browser verified Home and sidebar colors; git diff --check passed.

## Prompt 179: Sidebar chevrons removed
- Removed only leading project chevron, preserving toggle handler and aria-expanded. Browser verified project-name click expands task list. git diff --check passed.

## Prompt 180: Defer new chat creation
- New chat uses a reusable virtual task and saves a task on first send. Migration removes only unused projectless New chat placeholders and preserves content/drafts.
- Browser verified repeated New chat visits add no Inbox entries, legacy blanks are absent, and an unsent draft survives another New chat click. Test draft cleared.
- Build, 108 tests and git diff --check passed. Screenshot: no-empty-chats.png.

## Prompt 181: Stable Inbox width
- Removed Inbox-specific width overrides at all breakpoints. Browser measured 220px before and after toggling Inbox at desktop width; shared mobile drawer token remains 250px. git diff --check passed.

## Prompt 182: Restore button at top right
- Moved restore control to right:12px; reserved reader action spacing when hidden. Browser visually verified corner placement; git diff --check passed.

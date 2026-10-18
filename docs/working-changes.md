# Working changes

Changes that are made but not yet committed. The user decides when to commit and push. Remove an entry once it is committed.

## 2026-10-18 · Prompt #409

Completed to-dos strike through the text only.
- `src/features/workbench/workspace-layout.css`: `.is-complete span` → `.is-complete span:not(.composer-todo-meta)`. The `.composer-todo-meta` wrapper (Prompt #395) is a span, so the completed style struck through and muted the timestamp and run button too.
- Checked on a completed row: the text has `line-through`; the meta, timestamp and run button have none.
- `visual_ref/[prompt #409] fb929a77-7a35-4088-aca9-be2ef3bb4c3d.png`.

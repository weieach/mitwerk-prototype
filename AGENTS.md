# Project instructions

Whenever a user request establishes or changes a rule for the entire design system, record it in `docs/design-system-rules.md` and implement it using shared tokens or reusable graph-derived logic. Do not hardcode node-specific or screenshot-specific exceptions. Read that file before changing shared diagram behavior.

Preserve the intentionally blank left panel. Do not introduce unrelated design changes or external design systems.

The local app always runs on port **5173** (`http://localhost:5173`). Do not change this port, pick a fallback port, or point screenshots, OAuth redirects, or other local URLs at a different one.

On git push, snapshot the pushed tree into `[ver capture] codebase/` as a folder named like the matching push screenshot. Start numbering at push #6; do not commit that folder.

End every user-facing response with one line naming the current push number and the latest progress-screenshot prompt number, in the form `push #5 · prompt #25`. Read the highest `[push #N]` filename and the highest `[prompt #N]` filename in `[frame capture] screenshots/`. Do not print a version label here. Do not omit this footer.

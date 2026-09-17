# Project instructions

Whenever a user request establishes or changes a rule for the entire design system, record it in `docs/design-system-rules.md` and implement it using shared tokens or reusable graph-derived logic. Do not hardcode node-specific or screenshot-specific exceptions. Read that file before changing shared diagram behavior.

Preserve the intentionally blank left panel. Do not introduce unrelated design changes or external design systems.

The local app always runs on port **5173** (`http://localhost:5173`). Do not change this port, pick a fallback port, or point screenshots, OAuth redirects, or other local URLs at a different one.

End every user-facing response with one line naming the current selected version label and the latest progress-screenshot prompt number, in the form `V2.3 · prompt #24`. Read the live graph selection (layout label of the selected station in `.mitwerk-graph.json`) and the highest `[prompt #N]` filename in `screenshots/`. Do not omit this footer.

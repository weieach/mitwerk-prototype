# Project instructions

Whenever a user request establishes or changes a rule for the entire design system, record it in `docs/design-system-rules.md` and implement it using shared tokens or reusable graph-derived logic. Do not hardcode node-specific or screenshot-specific exceptions. Read that file before changing shared diagram behavior.

The left panel now contains the Iteration Gallery, as requested on 2026-09-22. Preserve the Version stream and do not introduce unrelated design changes or external design systems.

The local app always runs on port **5173** (`http://localhost:5173`). Do not change this port, pick a fallback port, or point screenshots, OAuth redirects, or other local URLs at a different one.

Version stream progress captures default to Commit history. Use `--tree-mode test` only when a debug/Test visual capture is explicitly requested.

Progress captures follow the gallery view the prompt is changing. A prompt about theater opens theater and waits for that frame. A prompt about the isometric album (isometric, overhead, reset, or top view) captures that album view. When a prompt names both, theater wins only if it does not ask for the isometric view instead.

Include each progress screenshot in the final chat response as an inline Markdown image using its absolute file path, not only a text link.

On git push, snapshot the pushed tree into `[ver capture] codebase/` as a folder named like the matching push screenshot. Start numbering at push #6; do not commit that folder.

Do not take a progress screenshot or increment the prompt counter for Ask mode prompts.

When the git branch is not `main`, include that branch name in prompt/push screenshot names and version-archive folder names.

When the user appends screenshots, save them in the existing `visual_ref/` folder. Do not create a separate visual-ref folder. Change the start of each filename to `[prompt #x]`, using the prompt number for that request, and keep the rest of the original filename.

Progress counters (source of truth for agents working across chats): **push #20 · prompt #182**. Read this file at the start of every prompt to get the latest counters; never rely on conversation memory. As each Agent-mode prompt finishes, reread this file and confirm the highest `[push #N]` and `[prompt #N]` in `[frame capture] screenshots/` to account for other chats, then increment the latest prompt counter by exactly one and write it here. A capture for that prompt uses the same number, not a second increment. After a real git push, set the push number to the new `[push #N]`. Do not increment in Ask mode or when the user explicitly excludes the current prompt from counting. A requested catch-up capture belongs to the previous prompt and does not count the current request separately; reuse that previous prompt's reserved number if it has no frame, otherwise use the next available number without overwriting an existing capture.

End every user-facing response with one line naming the current push number and the latest progress-screenshot prompt number, in the form `push #5 · prompt #25`. Use the counters in this file. If they look stale, reread `[frame capture] screenshots/` and update this file first. Do not print a version label here. Do not omit this footer.

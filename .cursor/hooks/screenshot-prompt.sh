#!/bin/sh
# Save the user prompt, then screenshot localhost:5173 when the agent finishes.
root="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$root" || exit 0
exec node "$root/scripts/screenshot-progress.mjs" --hook-mode

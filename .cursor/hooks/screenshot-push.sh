#!/bin/sh
# After an agent git push, capture if Cursor skipped the git hook.
root="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$root" || exit 0
exec node "$root/scripts/screenshot-progress.mjs" --hook-mode --reconcile-push --commit-and-push

# Working changes

Changes that are made but not yet committed. The user decides when to commit and push. Remove an entry once it is committed.

## 2026-10-18 · Prompt #373

- `AGENTS.md`: added the rule to commit or push only when asked, and to log uncommitted work here.
- `docs/working-changes.md`: created this log.
- `docs/prompt-log.md`: added Prompt #373.

## 2026-10-18 · Prompt #374

All sans-serif text switched from Neurial Grotesk to Helvetica Neue.

- `src/index.css`: `--sans` is now `'Helvetica Neue', Helvetica, Arial, sans-serif`. Every UI font rule already reads `--sans`, so this one token changes the whole app. The Neurial `@font-face` rules and `src/fonts/` files are left in place, unused; reverting means restoring `--sans: 'Neurial Grotesk', sans-serif`.
- `src/features/iteration-gallery/AlbumScene.ts`: the annotation-count bookmark texture was drawn with generic `sans-serif`; it now reads `--sans`.
- `src/features/workbench/TypeStudio.tsx`: Family option label reads Helvetica Neue.
- `docs/design-system-rules.md`: new rule at the top; the type-editor rule names Helvetica Neue.
- `docs/ui-restyle-guide.md`: font section updated.
- `docs/prompt-log.md`: added Prompt #374.
- Not changed: `public/demo/profile-panel.html` (standalone demo page with its own `system-ui` stack), and historical Neurial mentions in `DESIGN.md`, `PRODUCT.md`, and older entries of `docs/design-system-rules.md`.

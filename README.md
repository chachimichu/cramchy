# Cramchy

A vanilla HTML/CSS/JS academic companion, deployed as static files on Vercel. No framework or build step is required.

## Migration status

This branch starts at main commit 232560e51e3cbc202ca6264dcebb683f46f91f94. This checkpoint changes documentation only. Application behavior, assets, storage, and deployment configuration remain unchanged.

Read [STRUCTURE.md](STRUCTURE.md) for the target architecture, [DEVELOPMENT.md](DEVELOPMENT.md) for the workflow, and [MIGRATION-BASELINE.md](MIGRATION-BASELINE.md) for observed current behavior and verification gates. Target paths are not claims that migration is complete.

## Agent contract

- Work only on the migration branch. Never write directly to main; never edit/delete backup-before-cleanup. Do not merge or promote a deployment without the user's explicit approval.
- Use the old standardized-structure branch's documentation as a blueprint, not its code as a baseline.
- One complete concern per change. A vertical slice may include JS, CSS, shell wiring, and tests together.
- Preserve features, appearance, calculations, accessibility, saved data and cloud behavior. Refactoring does not authorize redesign or new features.
- Stable canonical filenames; no new version-suffixed patch files. Existing runtime patches remain until their responsibilities are replaced and verified.
- Explicit dependencies and initialization, no reliance on timing. Features own their DOM and use declared APIs for neighboring renders.
- Centralize persistence gradually; do not assume there is only one existing storage key. Never rename/consolidate keys as incidental cleanup.
- Verify each slice, show its Vercel preview, state what was and was not tested, and wait for approval before the next runtime slice.

## Current entry and CI

index.html loads app.js and styles.css plus external fonts and the Supabase SDK. These entries load further runtime files; app-base.js is active, not dead code.

Current CI validates vercel.json, checks required files, checks conflict markers in four entry/config files, and runs node --check app.js. It does not test all JavaScript or runtime behavior.

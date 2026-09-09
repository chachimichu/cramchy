# Development

## What you are working with

A static single-page app. No server, no build step required (Vercel serves the tree as-is). See `README.md` for the runbook and `STRUCTURE.md` for the target tree.

## Repo layout (target)

See `STRUCTURE.md`. The tree is being migrated from a flat dump into layered `styles/` and `js/` directories. Do not fight the migration; contribute to it one verified slice at a time.

## Editing

- Edit the canonical file for a concern. Do not create `*-vN` iteration copies. If you have an iteration, merge it into the canonical file and delete the copy.
- One concern per change. If you touch two layers, split it.
- The shell is `index.html`. Feature UI is rendered at runtime into containers the shell declares; do not embed feature-generated UI into the shell.
- CSS lives under `styles/`. Do not patch CSS by injecting a new file at runtime.
- JS lives under `js/`. New runtime modules are declared in the bootstrap load order; they are not discovered by timing.

## Versioning

- The app version is a single constant in `js/bootstrap.js`. Filenames do not carry version numbers.
- The deploy makes a version live. The `no-cache` headers in `vercel.json` exist so users get updates.

## Verification

Before claiming a change works:

1. Open the app locally.
2. Open the browser console; confirm there are no errors.
3. Navigate to the affected view; confirm it renders.
4. Perform the affected interaction; confirm it works.
5. If the change persists data, reload and confirm the data survived.
6. If CI is available, run it.

## Local run

Serve the tree statically and open `index.html`. Any static server works. Example with Python:

```
python3 -m http.server --directory /path/to/cramchy 8000
```

Then open `http://localhost:8000`.

Because the app is static, you can also just open `index.html` from disk for a quick smoke test, but a local server is closer to production and avoids file-url quirks.

## Data

All user data lives in `localStorage` under one key. There is also an optional cloud-sync path (Supabase, publishable key only). Cloud is a save target, not the source of truth.

When testing a data-layer change:

1. Test with a fresh profile (no stored data).
2. Test with existing stored data (the kind an old user would have).
3. If the change alters the state shape, verify the migration/repair path, not just the happy path.

## Migrations

- Migrations live in `js/migrations.js` and are versioned by a schema version on the state.
- Migrations must be idempotent: running twice must be safe.
- `loadState()` and repair run migrations. Test both paths.
- Do not mutate the state shape without a migration path for existing data.

## CSS

- All CSS is under `styles/`. One import chain or one bundled output; the runtime does not inject ad-hoc CSS.
- Prefer reducing `!important` over time rather than preserving the legacy volume of it.
- When you fix a visual issue, put the fix in the owning stylesheet, not in a new injected file.

## Scripts (JS)

- Each runtime module exposes at minimum an `init()` (wires DOM + events) and a render function (or set) that repopulates its view from current state.
- Bootstrap calls `init()` in declared order. Features call each other's `render()` explicitly when they change something a neighbor cares about. DOM timing luck is not a contract.
- State mutations go through `saveState()`. Do not write `localStorage` directly outside the storage layer.

## Build (optional, future)

An optional lightweight bundle step may be added later for performance. It must be optional: the static tree must still deploy as-is without it. Do not introduce a build step that breaks the static deploy.

## CI

GitHub Actions checks validate `vercel.json`, verify required app files, reject unresolved merge-conflict markers, and syntax-check inline JavaScript. As the migration progresses, add a check that `index.html` references only the new bootstrap and stylesheet set (no dangling references to deleted flat files).

## Pull requests

- Work on a branch: `feature/*`, `fix/*`, or `chore/*`.
- Open a PR against `main`. Use the preview deployment to verify.
- Keep PRs scoped to one concern where possible.
- Merge to `main` only after the preview deploys cleanly and the affected view/interaction is verified.

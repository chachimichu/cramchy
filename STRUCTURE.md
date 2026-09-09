# Structure

Target shape for cramchy. This is the contract for where things live and who owns them. The current flat tree is being migrated into this shape; see the migration notes at the bottom.

## Goal

- A tree an agent (or human) can navigate without archaeology.
- One owner per concern.
- No version numbers in filenames.
- No two files fighting over the same widget.
- Static-deployable on Vercel exactly as now.

## Target tree

```
cramchy/
├── README.md                 # project + AI agent runbook
├── STRUCTURE.md              # this file
├── DEVELOPMENT.md            # dev workflow, verification, CI
├── index.html                # shell: nav, view containers, static assets
├── vercel.json               # Vercel config (cleanUrls, no-cache headers)
├── assets/                   # static assets only (images, fonts if any)
│   └── ...
├── styles/                   # all CSS, owned by layer
│   ├── base.css              # resets/normalization + :root tokens if any
│   ├── shell.css             # nav, main, view framing, global components
│   ├── home.css              # daily home / dashboard view
│   ├── courses.css           # course cards, course modal
│   ├── planner.css           # planner view
│   ├── exam.css              # exam mode / schedule / subjects
│   ├── grades.css            # gradebook, GWA
│   ├── timer.css             # timer + study history
│   ├── matcha.css            # matcha corner, collectibles, break timer
│   ├── settings.css          # profile, theme picker, term manager
│   └── ...
├── js/                       # all runtime JS, one module per concern
│   ├── bootstrap.js          # version constant, stylesheet set, script load order, boot
│   ├── state.js              # state shape, freshState, storage read/write, saveState
│   ├── migrations.js         # versioned, idempotent state migrations
│   ├── helpers.js            # small pure helpers shared across modules (escapeHtml, uid, etc.)
│   ├── courses.js            # course CRUD, course modal, course list renders
│   ├── exams.js              # exam period, exam add/edit, schedule render
│   ├── subjects.js           # subjects/exam-mode tab + detail
│   ├── planner.js            # planner view (month/week/day), events, planner modal
│   ├── home.js               # daily home: greeting, stats, daily tasks, daily courses, quick add
│   ├── timer.js              # study timer, history
│   ├── countdown.js          # custom countdown
│   ├── matcha.js             # matcha corner, streaks, collectibles, break timer, backup/export/reset
│   ├── tasks.js              # cramchy quick tasks
│   ├── grades.js             # gradebook, GWA calculators
│   ├── settings.js           # profile, theme picker, term manager, repair
│   ├── cloud.js              # optional Supabase sync (if present)
│   ├── chat.js               # AI chat feature (if present)
│   └── ...
└── ...
```

## Ownership rules

- **Shell (`index.html`)** owns: nav, view `<section>` containers, static asset references, the elements that features render into. Does not own feature logic or feature-generated DOM.
- **Bootstrap (`js/bootstrap.js`)** owns: the single app version constant, the stylesheet set, the script load order, and kicking off the runtime. The only file that decides load order.
- **State (`js/state.js`)** owns: the state shape, `freshState()`, `loadState()`, `saveState()`, the single storage key. All persistence goes through here.
- **Migrations (`js/migrations.js`)** owns: versioned, idempotent migrations that transform old state into the current shape. Called by `loadState()` / repair.
- **Helpers (`js/helpers.js`)** owns: small pure functions used by more than one module (escaping, id generation, date formatting primitives). No DOM, no state.
- **Each feature module** owns: its own DOM wiring, its own render function(s), its own event handlers, its own modal/UI construction. It reads from state, calls `saveState()`, and explicitly re-renders neighbors it affects. It does not reach into another feature's DOM.
- **Styles (`styles/`)** own the cascade by slice. One file per visual area. The runtime does not inject ad-hoc CSS to patch things.

## What lives where (current concerns → target file)

- Daily home / dashboard → `js/home.js` + `styles/home.css`
- Courses (add/edit/schedule/remove, course list, course modal) → `js/courses.js` + `styles/courses.css`
- Exam mode / schedule / subjects → `js/exams.js` + `js/subjects.js` + `styles/exam.css`
- Planner (month/week/day, events, planner modal) → `js/planner.js` + `styles/planner.css`
- Study timer + history → `js/timer.js` + `styles/timer.css`
- Custom countdown → `js/countdown.js` + `styles/countdown.css` (or folded into shell if tiny)
- Matcha corner: streaks, collectibles, break timer, backup/export/reset → `js/matcha.js` + `styles/matcha.css`
- Quick tasks → `js/tasks.js` + `styles/tasks.css`
- Grades / GWA → `js/grades.js` + `styles/grades.css`
- Settings: profile, theme picker, term manager, repair → `js/settings.js` + `styles/settings.css`
- Cloud sync → `js/cloud.js` (only if the cloud path is a real feature; otherwise leave in core)
- AI chat → `js/chat.js` (only if it is a real feature)
- State + storage + migrations + shared helpers → `js/state.js`, `js/migrations.js`, `js/helpers.js`

## File naming rules

- No version numbers in filenames. The file is the current file. Iteration happens by editing it, not by renaming it to `*-vN.js`.
- The only place the app version appears is the constant in `js/bootstrap.js` plus the deploy.
- Stylesheet and script filenames are stable, lowercase, hyphenated, no spaces.

## CSS

- All CSS lives under `styles/`. There is one import chain or one bundled output; the runtime does not inject ad-hoc CSS files to patch things.
- `styles/base.css` is the reset/token layer if needed; otherwise the minimal base.
- Each visual area has one owning stylesheet. When in doubt, pick the slice that matches the feature, not the view.
- Avoid `!important` unless it is fighting a third-party constraint you cannot change. The current app uses a lot of `!important` because of the legacy merge chaos; the target is to reduce it over time, not to preserve it as a style.

## JS module contract

- Each runtime module is an IIFE or module that exports nothing to the global scope except what it must. It receives the shared state and helpers it needs via a small declared dependency (a shared module object or explicit imports), not via global variable spelunking.
- Each module exposes, at minimum, an `init()` that wires its DOM and events, and a `render()` (or render set) that repopulates its view from current state.
- Bootstrap calls `init()` in declared order. Features call each other's `render()` explicitly when they change something a neighbor cares about. DOM timing luck is not a contract.
- New modules are added to the bootstrap load order. They are not discovered by timing.

## Data layer

- One localStorage key. `saveState()` is the only write path outside migrations/repair.
- `loadState()` reads, sanitizes, runs migrations, returns the current state. Repair re-runs the same path.
- Migrations are versioned by a schema version on the state and are idempotent. The same migration can run twice safely.

## Static deploy

- Vercel serves the tree as static files. `index.html`, the bootstrap, and the stylesheet set have `no-cache` headers in `vercel.json` so updates land.
- No build step is required to deploy. An optional lightweight bundle step may be added later for performance; it must never break the static deploy and must be optional (the static tree must still deploy as-is).

## Migration plan (from current flat tree → target)

Do this in order, verifying after each step. Do not rewrite everything in one shot.

1. **Write the docs first** (done: README, STRUCTURE, DEVELOPMENT). This is the contract.
2. **Create the new directories** `styles/` and `js/`. Do not move anything yet.
3. **Pick one vertical slice and migrate it end to end** — the smallest feature that already works, e.g. quick tasks or the custom countdown. Move its JS into `js/`, its CSS into `styles/`, wire it from the new bootstrap, delete/fold its old iteration files, verify in the browser. This proves the target shape actually loads and works.
4. **Migrate the data/core layer next** — state, storage, migrations, shared helpers. This is the most sensitive layer; do it before the big features so later slices read from a clean core. Verify state load/save and repair.
5. **Migrate the big features one at a time**, leaving the current flat files in place until the new version of a feature is verified, then delete the old iteration files. Recommended order: courses → exams/subjects → planner → home → timer → matcha → grades → settings → cloud/chat if present.
6. **Fold CSS iteratively.** As each feature moves, merge its CSS into the owning stylesheet and delete the old CSS iteration files. Keep the app looking identical at every step.
7. **Delete the leftover versioned-trash files** only after the feature they attempted to patch is migrated and verified. No deletion without verification.
8. **Update `index.html`** to reference the new bootstrap and stylesheet set, not the old flat files. Keep the shell's view containers; do not move feature-generated UI into the shell.
9. **Run CI and a browser smoke test** after each migration step. If a step regresses, fix it before moving on.

## What gets deleted (the versioned-trash set)

These are iteration files that lost and got renamed instead of merged. They are deleted as their concerns are migrated into the canonical files — not before.

- `design-fixes.css`, `design-v3.css`
- `home-hero-v4.css`
- `home-hierarchy-v5.css`, `home-hierarchy-v5.js`
- `home-command-v6.css`, `home-command-v6.js`
- `planner-fixes.js`, `planner-root-compat-v4.js`, `planner-v3.js`
- `polish-v7.css`, `polish-v7.js`
- `theme-gradients-v8.css`
- `task-home-sync-v9.js`
- `app-logo-base.js` (folded into bootstrap/logos as appropriate)
- `app.js` (replaced by `js/bootstrap.js`)
- `app-base.js` (dead earlier monolith — not referenced by the current build; deleted during migration, not folded)
- `styles-base.css`, `styles.css` (folded into `styles/`)

Do not delete any of these until the corresponding concern is migrated and verified in the new shape.

## CI

- GitHub Actions checks validate `vercel.json`, verify required app files, reject unresolved merge-conflict markers, and syntax-check inline JavaScript.
- Add a check that the new bootstrap + stylesheet set are the ones referenced by `index.html` (no dangling references to deleted flat files) once the migration begins.

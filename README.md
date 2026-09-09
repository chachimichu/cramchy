# cramchy.

A cute academic companion for courses, tasks, study tracking, grades, and exam mode. Single-page static site; no backend, no build step required. Deployed on Vercel static hosting.

- **Branch workflow:** `main` stable production, `feature/*` new features, `fix/*` bug fixes, `chore/*` maintenance/tooling. Work on a branch first; preview; merge to `main` when ready.
- **Deploy:** Vercel connected to this repo with `main` as the production branch. Feature/fix branches get Preview Deployments; merges to `main` deploy to production.
- **CI:** GitHub Actions validates `vercel.json`, verifies required app files, rejects unresolved merge-conflict markers, and syntax-checks inline JavaScript.

---

# AI Agent Runbook

This doc is the contract for AI-driven work on this repo. Read it before touching anything.

## What this app is

- A static single-page app. `index.html` is the shell; a small bootstrap loads the runtime; runtime modules wire features and persist everything in `localStorage`.
- No server. No API. No build step required to deploy (Vercel serves the static tree as-is). An optional lightweight bundle step exists for the future; it must never break the static deploy.
- All user data lives in `localStorage` under one key. There is also an optional cloud-sync path wired to Supabase (publishable key only); cloud is a save target, not the source of truth.

## Current architecture (as of this writing)

The app is currently a flat tree with a monolithic core. That is the problem we are fixing. See `STRUCTURE.md` for the target shape and the migration plan.

## Layers (target mental model)

Once reorganized, the app has these layers. An agent working on a feature should know which layer it touches and stay inside it.

1. **Shell** — `index.html`. The page skeleton: nav, all view `<section>`s, static assets. The shell declares what views exist. Runtime features toggle `.active` on views and fill them in. Do not add feature logic here; add the container element if a new view is needed.

2. **Bootstrap** — loads the runtime in declared order, injects the stylesheet set, and kicks off the app. One small entry point. Owns version (the single source of truth for the app version string), stylesheet list, script load order.

3. **Core** — state shape, storage read/write, migrations, domain helpers (courses, exams, grades, subjects, planner primitives). This is the layer that must stay internally consistent. State mutations go through `saveState()`; storage is one key. Migrations are versioned and idempotent.

4. **Features** — one module per UI concern: dashboard/home, courses, subjects/exam-mode, planner, timer, countdown, matcha corner, tasks, grades, settings, cloud sync, AI chat. Each feature owns its DOM wiring, its render, and its event handlers. Features read from core state and call `saveState()`/render neighbors as needed. Features do not reach into each other's DOM.

5. **Styles** — a single coherent stylesheet set. No version numbers in filenames. One import chain or one bundled output. Each stylesheet owns a named slice of the cascade. The runtime does not inject ad-hoc CSS files to patch things; fixes land in the owning stylesheet.

## Rules for AI agents

- **One concern per change.** If a change touches two layers, split it.
- **No version numbers in filenames.** If you create a new iteration of a file, merge it into the canonical file and delete the iteration. Version lives in the bootstrap constant and the deploy.
- **Do not add a new IIFE that self-wires on DOMContentLoaded without registering it in the bootstrap load order.** New runtime modules are declared in the bootstrap, not discovered by timing.
- **Do not patch CSS by injecting a new file at runtime.** Put the fix in the owning stylesheet.
- **Do not embed feature UI in the shell unless it is a new view container.** Feature content is rendered at runtime into containers the shell declares.
- **State mutations go through `saveState()`.** Do not write `localStorage` directly outside the storage layer.
- **Migrations are additive and idempotent.** A migration that has already run must be safe to run again.
- **Tests/verification:** Before claiming a change works, run the app locally and assert there are no console errors, the affected view renders, and the affected interaction works. If there is an existing CI check, run it.
- **When in doubt about which file owns something, check the tree in `STRUCTURE.md` before guessing.**

## What not to touch without explicit reason

- The storage key and the state shape contract (unless you are doing a migration).
- The bootstrap load order (unless you are adding/removing a module).
- The shell's view list (unless you are adding a view).
- `vercel.json` cache headers (unless you have a measured reason).

## How to add a feature

1. Decide which layer it belongs to.
2. If it needs a new view, add a `<section class="view" id="view-...">` container to the shell and a nav button.
3. If it is a runtime feature, add its module to the bootstrap load order and give it a clear init/render contract.
4. Wire its DOM, its events, and its renders. Read from core state; persist through `saveState()`; render neighbors explicitly.
5. Put its styles in the owning stylesheet, not a new injected file.
6. Verify in the browser: no console errors, view renders, interaction works.

## How to verify a change

- Open the app locally.
- Check the console for errors.
- Navigate to the affected view.
- Perform the affected interaction.
- If the change persists data, reload and confirm the data survived.
- Run CI if it is available.

## Deployment notes

- Vercel serves this tree as static files. `index.html`, `app.js` (bootstrap), and the stylesheet set have `no-cache` headers so updates land for users (see `vercel.json`).
- The app version is a single constant in the bootstrap. The deploy is what makes a version "live"; filenames do not carry version numbers.

---

# Structure

See `STRUCTURE.md`.

# Development

See `DEVELOPMENT.md`.

# Deployment

See `vercel.json` and thedeploy section of this README.

# Target structure and migration plan

## Target, not current layout

Keep index.html as the shell, assets/ for images, and vercel.json for static hosting. Future styles/ owns base, shell and feature styles. Future js/ owns:

- bootstrap.js: declared script/style ordering, readiness and eventually one app version source.
- state.js and migrations.js: persistence adapters, state contract, validation, versioned idempotent migrations.
- helpers.js: pure shared helpers without DOM or storage side effects.
- Feature modules: courses, exams, subjects, planner, home, timer, countdown, matcha, tasks, grades, settings, cloud and chat.

Preserve current multiple-key data contracts behind storage adapters first. A single persistence API does not require a single physical key. Any consolidation is a separately reviewed data migration.

## Ownership and contracts

Features expose explicit init and render APIs, accept declared dependencies, and own their event handlers and DOM. Reinitialization must not duplicate handlers, observers or timers; define disposal where needed. Shared UI belongs to a shared UI owner. Cross-feature updates use explicit APIs or declared events, not another feature's DOM internals.

Use one consistent module mechanism once selected and tested; retain compatible legacy adapters during extraction. Do not switch every classic script to modules blindly: closure scope, globals and inline handlers must be mapped first.

Keep stable canonical styles with explicit cascade order. Preserve existing selector priority and !important behavior during extraction; simplify later in separate verified changes. No new runtime patch stylesheets.

Bootstrap must wait for actual dependency readiness, including nested script loading and cloud readiness, not merely the outer script onload event. Preserve existing fallbacks until equivalent behavior is tested.

## Stages

1. Document the current application and verification gates (this checkpoint).
2. Establish reproducible baseline fixtures and browser checks; select the smallest isolated working slice based on dependency inspection.
3. Extract that slice end to end on the new branch. Introduce only the compatibility boundary needed; keep the existing boot chain working.
4. Migrate storage/core using explicit compatibility contracts and fresh/legacy-data tests before larger dependent features.
5. Migrate remaining features one at a time, updating HTML/bootstrap/style paths atomically with each slice.
6. Consolidate each feature's patches only once all behavior is accounted for. Preserve byte-equivalent archived originals when appropriate; do not activate both old and new handlers.
7. Retire the monolith only when every responsibility has a tested owner and no active references remain.
8. Review deployment paths/cache headers and perform a full desktop/mobile regression check before requesting merge approval.

app-base.js is ACTIVE. There is no pre-approved deletion list. Use current reference tracing and tests, not filename age, to decide retirement. The separate cleanup branch has not been silently merged into this migration branch.

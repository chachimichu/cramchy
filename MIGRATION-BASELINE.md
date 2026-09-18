# Migration baseline

Source commit: 232560e51e3cbc202ca6264dcebb683f46f91f94. Inventory obtained by reading repository source, not by exercising a signed-in production account. This is a starting inventory, not a completed test report.

## Runtime load order

index.html -> app.js. app.js refreshes styles, fetches app-base.js, then loads these scripts in order:

1. boot-resilience-v11.js
2. js/countdown.js
3. js/motivation.js
4. js/streak.js
5. js/collectibles.js
6. js/brain-break.js
7. js/chaowi.js
8. js/pet-duo.js
9. js/study-timer.js
10. js/tasks.js
11. js/courses.js
12. app-logo-base.js
13. exam-nav-active-v14.js
14. exam-subject-dedupe-v21.js
15. planner-cloud-sync-v12.js
16. planner-root-compat-v4.js
17. planner-v3.js
18. planner-mobile-hotfix-v44.js
19. home-hierarchy-v5.js
20. home-command-v6.js
21. polish-v7.js
22. home-planner-reminders-v23.js
23. mobile-modal-center-v30.js
24. ui-copy-normalizer-v1.js
25. grades-nu-polish-v1.js
26. grades-quick-gwa-v43.js
27. ask-cramchy-v53.js
28. special-letter-v54.js

app-logo-base.js injects app-base.js; app.js also has a base-readiness wait and a planner-cloud-readiness wait. Preserve these nested dependencies. Multiple legacy version strings currently exist; unification is a later change.

## Styles

app.js stylesheet set, in declared order:

- styles.css
- styles/countdown.css
- styles/motivation.css
- styles/matcha-progress.css
- design-v3.css
- home-hero-v4.css
- home-hierarchy-v5.css
- home-command-v6.css
- polish-v7.css
- theme-gradients-v8.css
- typography-polish-v17.css
- home-planner-reminders-v23.css
- mobile-shell-fix-v30.css
- planner-mobile-hotfix-v44.css
- grades-nu-polish-v1.css
- grades-stable-v42.css
- grades-quick-gwa-v43.css
- exam-subject-stability-v49.css

styles.css also imports styles-base.css and Google Fonts. Preserve ordering and asset-relative paths while moving styles.

## Observed storage contracts

| Key | Source responsibility |
|---|---|
| strawberryMatchaMidtermsState_v1 | Core academic state; also read/written by legacy adapters |
| cramchyLastAppVersion | Core version flag |
| cramchyPlannerEvents_v2 | Planner events, cloud adapter and reminders/chat reads |
| cramchyPlannerEvents_v1 | Legacy Planner fallback/migration source |
| cramchyTermGwaPlanner_v2 | Term GWA planning data; grades/chat |
| cramchyGradesSelectedTerm | Selected Grades term |
| cramchySpecialLetterSeen_v2 | One-time letter flag |

An exam-deduplication migration marker is also declared in exam-subject-dedupe-v21.js. Before storage extraction trace wrapper calls, computed keys and Supabase SDK session storage; this table is not an exhaustive auth-storage inventory.

Core freshState includes subjects, missions, studyHistory, activeSubject, motivationIndex, customCountdown, pet settings/position, profile, courses, gradebook, quickGwaRows, examPeriod, examContext, examData, archivedTerms and migration/version metadata. Planner events and Term GWA data are not all contained in that object.

loadState reads and sanitizes the main key, applies migrations, and can persist cleaned state. Its catch returns freshState. saveState uses a 260ms debounce and queues cloud saving. Preserve identifiers, period/category relationships and pending-write semantics; audit repair and cloud restore before extracting them.

## Regression checklist (NOT YET EXECUTED)

- Onboarding, nickname, special letter once-only behavior, themes and settings.
- Courses, schedule, terms, exams and deduplication.
- Planner month/week/day, event persistence, Home reminders and cloud behavior.
- Gradebook weights/periods/categories; 95.49 -> 3.5, 95.50 and 95.78 -> 4.0; Term GWA and Quick GWA.
- Tasks, study timer/history, countdown, pets and Matcha features.
- Ask Cramchy saved-data answers and mobile send control.
- Backup/import/repair, reload persistence and recovery paths.
- Favicons, manifest icons, iOS Home Screen and mobile keyboard/modal layout.

## Migration checkpoint 1: custom countdown

The test-only synthetic data runner now provides deterministic academic, Planner, grade, task and countdown data without touching production storage. CI validates every active JavaScript file, declared runtime asset paths, clean test-page routes and the extracted countdown behavior.

Custom countdown behavior now belongs to `js/countdown.js`, with its feature styles in `styles/countdown.css`. It receives state, persistence and toast dependencies from the legacy core, owns its event handlers and one-second timer, and exposes render/update/dispose behavior. The main state schema and sanitizer remain unchanged. Exam countdown behavior remains in the legacy core.

The three files archived on `chore/cleanup-unused-files` remain as on main here because that branch was not merged. This is one verified extraction slice, not approval to retire `app-base.js` or migrate storage. Full desktop/mobile regression and cloud/persistent-storage tests are still required before merge approval.

## Migration checkpoint 2: dashboard motivation

The Dashboard Motivation widget now belongs to `js/motivation.js`, with its feature styles in `styles/motivation.css`. The module owns the message catalog, rendering, random next-message selection and its button handler. It receives only state and persistence dependencies from the legacy core, preserves the existing `motivationIndex` storage contract, and exposes render/dispose behavior.

CI now exercises motivation rendering, selection, persistence and listener cleanup. Dashboard, Tasks, Matcha and Timer remain in the legacy core until their shared state and cross-render dependencies are mapped and tested.

## Migration checkpoint 3: three Matcha-area features

Three independent features moved out of the legacy core in one tested batch:

- `js/streak.js` owns consecutive-day calculation, streak display and Matcha commentary.
- `js/collectibles.js` owns the collectible catalog and unlock rendering at one collectible per three completed topics.
- `js/brain-break.js` owns the five-minute timer, start/pause/reset handlers, completion toast and timer cleanup.

Streak and collectible presentation rules now live in `styles/matcha-progress.css`. The study-history and topic calculations remain behind explicit injected dependencies. Backup/import/reset was deliberately left in the legacy core because it replaces global state and can trigger cloud persistence; it requires its own migration and recovery tests.

## Migration checkpoint 4: study timer and companions

The Study area now has three explicit module owners:

- `js/study-timer.js` owns timer presets and controls, academic-aware subject choices, session completion, Study History rendering, and updates to Matcha/Home after a completed session.
- `js/pet-duo.js` owns Hanabi and Kenken reactions plus their persisted nap and hidden controls.
- `js/chaowi.js` owns Chaowi messages, mode persistence, idle and reaction timers, reduced-motion behavior, and reactions triggered by study sessions or completed topics and tasks.

The existing `studyHistory`, `petDuoHidden`, `petDuoNap`, and `chaowiMode` state contracts remain unchanged. Timer history still records academic keys and exam periods, and Ask Cramchy continues to resolve historical subject names through a compatibility helper. Feature presentation remains in `styles-base.css` for this checkpoint so CSS cascade consolidation can be reviewed separately from runtime ownership.

## Migration checkpoint 5: shared Tasks ownership

`js/tasks.js` now owns the shared `missions` behavior across Dashboard missions, the Cramchy Tasks page, and the Home checklist. Adding, completing, reopening, or deleting a task renders all three surfaces from one state source and persists through the existing save pipeline. The Home surface still shows the first five tasks, while its counter covers every incomplete task.

The `missions` storage contract remains unchanged, including existing identifiers, text and completion flags. The old `task-home-sync-v9.js` runtime patch is no longer loaded because cross-surface updates are direct module behavior instead of synthetic mirrored events. Planner reminders remain separate and still load through `home-planner-reminders-v23.js`.

## Migration checkpoint 6: courses and class schedules

`js/courses.js` now owns three connected responsibilities: filtering courses by academic year and term, normalizing old and current class-schedule formats (including next-class calculation), and rendering both the Courses catalog and Home course strip. It also owns course upsert/removal persistence and the removal cascade for Gradebook and course-linked Exam workspace records.

The existing `courses`, `gradebook`, and `examData` shapes are unchanged. The legacy core still presents the course editor modal for now, but it submits mutations through the Courses module. Grades, Study choices, Exam subjects, Home, and Ask Cramchy continue consuming the same compatibility helpers while their own migration slices remain pending.

## Observability checkpoint: privacy-friendly page analytics

The production app shell now loads Vercel Web Analytics through the first-party `/_vercel/insights/script.js` endpoint. It records aggregate page views and unique visitors without reading Cramchy profile, grade, task, or school data. The isolated `/testing/` runner explicitly excludes this script so seeded and reload tests do not inflate real usage counts.

Analytics collection begins only after Web Analytics is enabled for the Vercel project and this integration is deployed. It cannot reconstruct anonymous traffic from before installation.

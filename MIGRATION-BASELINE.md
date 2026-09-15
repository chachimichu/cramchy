# Migration baseline

Source commit: 232560e51e3cbc202ca6264dcebb683f46f91f94. Inventory obtained by reading repository source, not by exercising a signed-in production account. This is a starting inventory, not a completed test report.

## Runtime load order

index.html -> app.js. app.js refreshes styles, fetches app-base.js, then loads these scripts in order:

1. boot-resilience-v11.js
2. app-logo-base.js
3. exam-nav-active-v14.js
4. exam-subject-dedupe-v21.js
5. planner-cloud-sync-v12.js
6. planner-root-compat-v4.js
7. planner-v3.js
8. planner-mobile-hotfix-v44.js
9. home-hierarchy-v5.js
10. home-command-v6.js
11. polish-v7.js
12. task-home-sync-v9.js
13. home-planner-reminders-v23.js
14. mobile-modal-center-v30.js
15. ui-copy-normalizer-v1.js
16. grades-nu-polish-v1.js
17. grades-quick-gwa-v43.js
18. ask-cramchy-v53.js
19. special-letter-v54.js

app-logo-base.js injects app-base.js; app.js also has a base-readiness wait and a planner-cloud-readiness wait. Preserve these nested dependencies. Multiple legacy version strings currently exist; unification is a later change.

## Styles

app.js stylesheet set, in declared order:

- styles.css
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

## This checkpoint

Documentation only. No JS/CSS/HTML/assets/config/workflow changes; no data migrations or feature extraction. The three files archived on chore/cleanup-unused-files remain as on main here because that branch was not merged. Runtime browser tests and full data fixtures remain required before the first extraction.

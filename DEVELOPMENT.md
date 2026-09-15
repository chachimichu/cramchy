# Development and verification

## Workflow

Start from the recorded main baseline on chore/migration-foundation. Preserve main and backup-before-cleanup. Keep changes reviewable and reversible; never force-push shared branches. Preview-only deployment until the user approves merging.

Serve the repository with a local static HTTP server. Do not depend on file:// behavior. No build tooling or framework conversion is required.

## Gates before a runtime slice

- Record the affected functions, dependencies, data keys, observers/timers and CSS ordering.
- Create synthetic fixtures for fresh data and representative legacy data; do not commit real student records, auth sessions, credentials or exports.
- Verify the baseline with identical fixtures before and after the change; record known existing failures separately.
- Use isolated browser profiles and test accounts for cloud writes. Preview origins do not share production localStorage but may point to the same cloud backend; never assume they are safe sandboxes.
- Do not clear user storage or caches as a testing shortcut. Keep recoverable exports for data migrations with user permission.

## Checks per slice

1. Check syntax for every affected JavaScript file, not just app.js; validate local script, stylesheet, CSS import, asset and manifest paths.
2. Load the app, inspect console/network failures and navigate the affected view.
3. Exercise create/edit/delete or equivalent behavior with synthetic data. Reload after pending saves complete and compare persisted values.
4. Check related views: Planner/Home/chat and Gradebook/GWA/chat must remain consistent.
5. Test legacy migrations twice, repair separately, malformed data, failed/quota-limited saves, and offline behavior when persistence is affected. Never claim data safety from a clean console alone.
6. Check narrow mobile layout, keyboard, dialogs, chat send button, and real iOS/Home Screen behavior where relevant. Desktop emulation is not proof of iOS correctness.
7. Push the branch, check CI and Vercel status, provide the exact preview URL, and list untested cases. A successful deployment is not end-to-end verification.
8. Wait for user preview approval before the next runtime slice. Never merge automatically.

## Rollback

Keep an identified last-good commit per slice. Roll back code through a new branch commit, without rewriting protected branches. A code rollback cannot undo a destructive data migration; design additive/backward-compatible migrations and verify recovery before writes.

## Current CI limitation

The existing workflow checks JSON, required entry files, conflict markers in index.html/styles.css/app.js/vercel.json, and app.js syntax only. Expanding coverage is planned before runtime extraction; it is not implemented by this documentation checkpoint.

# Test-only seed

Open `/testing/` through a local static server or the migration branch preview. Click **Load sample data**. Production index.html never imports these tools.

`seedCramchyTestData({now: '2026-09-15T12:00:00'})` returns a deterministic key/string map. It does not write to any storage itself. Omitting now puts Planner examples near today.

The runner loads the existing app shell with memory-backed localStorage/sessionStorage before app scripts run, stubs cache cleanup, removes external scripts (including Supabase), and blocks external network connections through CSP. No real browser storage is read, cleared or overwritten. The test frame's cloud/login actions are intentionally unavailable.

Four synthetic courses cover 95.78%, 95.50%, 95.49% and no-score cases, with all four grading categories. Also includes Quick GWA rows, complete/incomplete tasks, countdown and five Planner event types. No real student details. The letter is marked seen in the sample fixture; Start empty covers onboarding.

Reload test app retains in-memory edits after the save debounce. Resetting samples or refreshing the whole test page discards them. This harness verifies UI/state reload behavior, not real persistent storage, cloud, iOS installation or storage quota failures. Those need separate tests.

This helper does not yet cover all legacy schema variants or every feature.

Run the migration checks with:

```sh
node testing/validate-static.cjs
node testing/path-check.cjs
node testing/countdown.test.cjs
node testing/motivation.test.cjs
```

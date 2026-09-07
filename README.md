# cramchy.

A cute academic companion for courses, tasks, study tracking, grades, and exam mode.

## Branch workflow

- `main` — stable production
- `feature/*` — new features
- `fix/*` — bug fixes
- `chore/*` — maintenance and tooling

Work on a branch first, use the preview/test result, then merge into `main` when ready.

## CI

GitHub Actions checks the repository on pushes and pull requests. The current checks validate `vercel.json`, verify required app files, reject unresolved merge-conflict markers, and syntax-check inline JavaScript.

## Deployment

Vercel should be connected to this GitHub repository with `main` as the production branch. Feature/fix branches can then receive Preview Deployments, while merges to `main` deploy to production.

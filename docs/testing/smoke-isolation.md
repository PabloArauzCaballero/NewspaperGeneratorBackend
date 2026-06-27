# Smoke isolation and rate-limit stability

## Problem fixed

Earlier smoke runs could affect later smoke runs because they reused seeded users and the same HTTP client identity. Two symptoms appeared:

- `GET /premium/articles/... expected 403 but got 200` when `lector.demo@periodico.test` had already been upgraded by a previous checkout smoke.
- `POST /auth/login expected 201 but got 429` when a previous smoke had filled the auth rate-limit bucket.

## Fix

- `scripts/smoke-http.ts` now uses a unique `User-Agent` per run.
- `scripts/security-smoke.ts` now uses a unique `User-Agent` per run, while keeping it stable inside that run so the rate limit is still proven.
- `scripts/smoke-http.ts` no longer depends on the seeded free reader for paywall checks. It creates an ephemeral reader and only upgrades that same ephemeral user after the free-reader checks finish.

## Recommended order

```powershell
yarn test:smoke:db
yarn test:smoke:http
yarn test:security
yarn start:worker:events:once
yarn test:all
```

If you want a fully clean state:

```powershell
docker compose down -v
docker compose up -d postgres redis
yarn db:migrate
yarn db:seed
yarn test:all
```

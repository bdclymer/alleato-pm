# AAI-660 Vercel Cron Deletion Proof

Date: 2026-06-25

## Deleted Candidates

- `frontend/src/app/api/cron/graph-sync/route.ts`
- `frontend/src/app/api/cron/graph-embed/route.ts`
- `frontend/src/app/api/cron/acumatica-sync/route.ts`
- `frontend/vercel.json` cron registrations for:
  - `/api/cron/graph-sync`
  - `/api/cron/graph-embed`
  - `/api/cron/acumatica-sync`

## Vercel Provider Proof

Command:

```bash
vercel crons ls
```

Evidence:

- [vercel-crons-aai-660.txt](vercel-crons-aai-660.txt)

Result:

- Vercel reported the project cron set as disabled.
- The three deleted paths were Vercel-manifest-only references outside their own route files.

Reference proof command:

```bash
rg -n '(/api/cron/(graph-sync|graph-embed|acumatica-sync)|cron/(graph-sync|graph-embed|acumatica-sync)|POST /api/cron/(graph-sync|graph-embed|acumatica-sync))' frontend/src scripts package.json render.yaml frontend/vercel.json -g '!frontend/src/app/api/cron/graph-sync/route.ts' -g '!frontend/src/app/api/cron/graph-embed/route.ts' -g '!frontend/src/app/api/cron/acumatica-sync/route.ts'
```

Result before deletion:

- `frontend/vercel.json` was the only source reference outside the route files themselves.

## Render Replacement Proof

Graph sync and embedding:

- Render cron `alleato-graph-sync` is `not_suspended`.
- Schedule: `20 */2 * * *`.
- Command calls `run_graph_sync(..., run_embedding=True, embed_limit=25)`.
- `npm run rag:verify:graph-embedding` passed.

Acumatica:

- Render cron `alleato-acumatica-financial-sync` is `not_suspended`.
- Schedule: `0 0,12 * * *`.
- Command: `python3 scripts/run_acumatica_financial_sync.py`.
- `npm run verify:acumatica-sync-health` passed after guarded canonical run.

## Kept Routes

The admin/manual source-sync routes remain intact:

- `frontend/src/app/api/admin/source-sync/graph-sync/route.ts`
- `frontend/src/app/api/admin/source-sync/graph-embed/route.ts`

These are operations/admin trigger surfaces, not Vercel cron ownership.

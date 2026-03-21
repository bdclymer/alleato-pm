# Contributing to Alleato-PM

## Development Setup

1. Clone the repo.
2. Run `npm run install:all`.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. Configure backend environment variables required by `backend/start.sh`.
5. Start the app with `npm run dev`.

Useful checks:

- `npm run db:types`
- `npm run check:routes`
- `cd frontend && npm run quality`
- `npm run verify:browser`

## Code Review

All PRs are automatically reviewed by our AI code reviewer. It checks for:
- Correctness and edge cases
- Security issues (auth, PII, injection)
- Performance concerns
- Code maintainability

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`

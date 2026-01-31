# React 19 Hydration & Effects Reference

**Source**: https://react.dev/reference/react-dom/client/hydrateRoot
**Version in repo**: React ^19.2.3 (see `frontend/package.json`).

## Anchored References
- Hydration: https://react.dev/reference/react-dom/client/hydrateRoot
- useEffect: https://react.dev/reference/react/useEffect
- useState: https://react.dev/reference/react/useState

## Key Points to Apply
- **Hydration mismatches** happen if server-rendered HTML doesn’t match client-rendered output. Avoid using browser-only values during initial render.
- **Client-only state** (e.g., `window`, `document`, `localStorage`) should be accessed inside `useEffect`.
- **Stable initial state** prevents flicker: derive defaults from props or static values during SSR.

## Gotchas
- Using `Date.now()` or random IDs in render can cause hydration errors. Seed values in server and pass as props if required.
- `useEffect` runs after paint; for layout-sensitive DOM reads, consider `useLayoutEffect` (client-only).

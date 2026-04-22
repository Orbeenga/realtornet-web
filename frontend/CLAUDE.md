# RealtorNet — Frontend CLAUDE.md
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 deployed on Vercel. Phase D + E closed. Phase F in progress.

## Navigation Contract (Locked — Do Not Modify Without Referencing navigation.ts)

| Role | Navbar items | Post-login redirect |
|---|---|---|
| Seeker | Properties, Favorites, Saved searches, Inquiries | `/properties` |
| Agent | Properties, My listings, Inquiries, Favorites | `/account/listings` |
| Admin | Properties, Property moderation | `/account/listings` |

- `/account/listings` gate: `role === 'agent' || role === 'admin'`
- Admin data source: `GET /api/v1/admin/properties` (all listings)
- Agent data source: own listings only

## API Layer Rules

- No `fetch()` calls inside components — always use hooks
- All API calls via TanStack Query hooks in `/features/*/hooks/`
- API types from `src/types/api.generated.ts` only — no manual interfaces
- `apiClient` injects Bearer token from Supabase session on every request
- `ApiError` class normalises error shape (status, detail, field errors)

## Auth Rules

- Supabase Auth JS SDK manages session — no custom auth server
- Silent JWT refresh on 401: intercept → refresh → retry once → logout (DEF-FE-D006, open)
- Logout: `supabase.auth.signOut()` + `router.push('/login')` + `queryClient.clear()`
- Registration hardcoded to seeker role — do not accept role from payload

## Code Rules

- TypeScript strict mode — `tsc --noEmit` must pass on every commit
- No `any` without explicit comment justification
- No inline styles — Tailwind classes only
- No hardcoded strings for labels, routes, messages — use constants files
- Zod schemas mirror Pydantic models — field names and types must match

## Open Bugs (as of April 22 2026)

| Bug | Status |
|---|---|
| Agent dashboard — new listing not appearing in My Listings | 🔴 Open |
| Agent profile details not displaying | 🔴 Open |
| Agency profile details not displaying | 🔴 Open |
| Amenities hardcoded — should fetch from API | 🔴 Open |
| Property type dropdown hardcoded — should fetch from `/api/v1/property-types/` | 🟡 Open |
| Location dropdown hardcoded — seeded list MVP, Nominatim Phase G | 🟡 Open |

## Phase F Open Items (Frontend)

| ID | Item | Status |
|---|---|---|
| F.4 | TBT < 100ms — revised to 200–300ms, deferred to Phase G | Revised |
| F.5 | Listing verification toggle on agent dashboard | 🔴 Open |
| F.5 | is_verified filter display on agent dashboard | 🔴 Open |
| F.6 | Silent JWT refresh on 401 | 🔴 Open |
| F.6 | Lighthouse accessibility audit — zero critical violations | 🔴 Open |
| F.6 | Admin role promotion UI (seeker → agent) | 🔴 Open |
| F.6 | Back navigation stack from property detail | 🟡 Open |
| F.6 | Agent favouriting UX labels | 🟢 Open |

## Bundle Notes

- PropertiesExplorer: dynamic import via client shell — deployed
- Toast: deferred initialisation — deployed
- React Query Devtools: removed from production — deployed
- `.browserslistrc` updated to modern targets — pushed at ed7a615
- Residual core-js polyfills from third-party deps — full elimination Phase G

## Lighthouse Targets

| Metric | Target | Status |
|---|---|---|
| Mobile LCP | < 2.5s | ✅ 2.0s confirmed |
| Desktop TBT | < 300ms (revised) | 🔴 ~800ms median |
| Mobile TBT | < 300ms (revised) | 🔴 ~800ms median |
| CLS | < 0.1 | ✅ Green |
| Accessibility | 0 critical violations | 🔴 Not yet audited |

## Type Generation

```bash
pnpm gen:types
# Runs: openapi-typescript http://localhost:8000/api/v1/openapi.json -o src/types/api.generated.ts
# Run whenever backend schemas change
```

## Local Lighthouse

```bash
pnpm lighthouse
# Runs: lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
# Point at Vercel URL for production audits
# Requires Chrome installed
```

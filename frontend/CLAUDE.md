# RealtorNet - Frontend CLAUDE.md
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 deployed on Vercel. Phase D + E closed. Phase F is closed. Phase G is now open.

## Navigation Contract (Locked - Do Not Modify Without Referencing navigation.ts)

| Role | Navbar items | Post-login redirect |
|---|---|---|
| Seeker | Properties, Favorites, Saved searches, Inquiries | `/properties` |
| Agent | Properties, My Listings, Inquiries, Favorites | `/account/listings` |
| Admin | Properties, Property moderation, Users, Inquiries | `/account/listings` |

- `/account/listings` gate: `role === "agent" || role === "admin"`
- `/account/users` gate: `role === "admin"`
- Admin listings data source: `GET /api/v1/admin/properties`
- Agent listings data source: own listings only

## API Layer Rules

- No `fetch()` calls inside components - always use hooks
- All API calls go through TanStack Query hooks in `/features/*/hooks/`
- API types come from `src/types/api.generated.ts` only - no manual interfaces
- `apiClient` injects the Bearer token on every request
- `ApiError` normalizes error shape as `status`, `detail`, and `fieldErrors`

## Auth Rules

- Supabase Auth JS SDK manages session
- Silent JWT refresh on 401 is implemented: refresh -> retry once -> logout on failure
- Logout flow: `supabase.auth.signOut()` + `router.push("/login")` + `queryClient.clear()`
- Registration remains seeker-only from the frontend
- Admin role promotion now goes through the backend API so DB role data and Supabase Auth metadata stay in sync

## Code Rules

- TypeScript strict mode - `tsc --noEmit` must pass on every commit
- No `any` without explicit justification
- No inline styles - Tailwind classes only
- No manual API response interfaces when generated types exist
- Zod schemas should mirror backend field names and types

## Resolved This Session

| Item | Status |
|---|---|
| Amenities API fetch | Resolved |
| Verify/unverify query invalidation | Resolved |
| Agent My Listings frontend filter check | Resolved |
| Inquiry empty state on received inquiries | Resolved |
| Agency branding on property detail | Resolved |
| Admin promotion UI | Resolved |
| Supabase Auth sync path via admin API | Resolved |

## Phase G Active Backlog

| Item | Status |
|---|---|
| DEF-G-INQ-002 | Inquiry property hydration / 204 investigation |
| DEF-G-TBT-001 | TBT < 100ms (RSC evaluation) |
| DEF-G-MOD-001 | Full moderation status enum |
| DEF-G-AG-001 | Agency name on property cards |
| DEF-G-POLYFILL-001 | Residual core-js |
| DEF-002 | Audit log retention |
| DEF-007 | psycopg3 dev restart |
| Phase G feature | Advanced map (Mapbox) |
| Phase G feature | Admin analytics |
| Phase G feature | Saved search notifications |
| Phase G feature | Custom domain |

## Bundle Notes

- `PropertiesExplorer` dynamic import via client shell - deployed
- Toast deferred initialization - deployed
- React Query Devtools removed from production - deployed
- `.browserslistrc` updated to modern targets
- Residual `core-js` polyfills from third-party dependencies remain a Phase G concern

## Locked Decisions

- Backend local env had been pointing at dev
- Production Supabase project: `avkhpachzsbgmbnkfnhu`
- Dev Supabase project: `umhtnqxdvffpifqbdtjs`
- Never mix production and dev Supabase projects during verification, cleanup, or type regeneration
- Agency branding is pre-launch scope on property detail only for now: compact logo + agency link on detail, no per-card fetches on listing grids
- Property card agency text stays deferred until the property list response includes agency branding fields; do not introduce N+1 card fetches
- Agency-wide inquiries remain deferred to Phase G; no frontend aggregation from per-property inquiry endpoints

## Lighthouse Targets

| Metric | Target | Status |
|---|---|---|
| Mobile LCP | < 2.5s | 2.0s confirmed |
| Desktop TBT | < 300ms (revised) | ~800ms median |
| Mobile TBT | < 300ms (revised) | ~800ms median |
| CLS | < 0.1 | Green |
| Accessibility | 0 critical violations | Confirmed |

## Type Generation

```bash
pnpm gen:types
# Runs: node scripts/gen-types.mjs
# Resolves the OpenAPI target from NEXT_PUBLIC_API_URL, with API_URL fallback
# Run whenever backend schemas change
```

## Local Lighthouse

```bash
pnpm lighthouse
# Runs: lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
# Point at the Vercel URL for production audits
# Requires Chrome installed
```

## Next Session Handover

- Start Phase G with `DEF-G-INQ-002` and verify the true cause of inquiry property hydration failures
- Evaluate TBT reduction paths under `DEF-G-TBT-001`, including RSC/server-first migration options
- Design the moderation-status enum expansion before implementation under `DEF-G-MOD-001`
- Keep agency card branding blocked on backend response enrichment; do not introduce N+1 card fetches
- Preserve the production vs dev Supabase separation during all future verification and cleanup work

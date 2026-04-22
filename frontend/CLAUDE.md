# RealtorNet - Frontend Agent Context

## Stack (locked)
Next.js 14 App Router · TypeScript strict · Tailwind CSS · shadcn/ui
TanStack Query v5 · Supabase Auth JS SDK · Zustand · React Hook Form + Zod
openapi-typescript for type generation · pnpm

## Core rules (never break)
- No fetch() calls inside components - all API calls via hooks in /lib/api
- No manual TypeScript interfaces for API responses - use src/types/api.generated.ts
- No inline styles - Tailwind classes only
- No business logic in UI components
- Backend is source of truth - frontend is a consumer only
- URL state owns filters and pagination (searchParams)
- Zustand owns modals and global UI only
- Zod schemas must mirror backend Pydantic models exactly

## Deployment & Safety Rules
- Always force HTTPS on API base URLs. The guard lives in `src/lib/api/client.ts` and `next.config.ts` - never remove it.
- Public routes (`/properties`, `/agents`, `/agencies`) must render server-first without client auth redirects. Only `/account/*` paths are auth-gated.
- Sentry must be initialised via deferred async import, never blocking the initial render. Pattern lives in `src/app/SentryDeferredInit.tsx`.
- Never add `pnpm-workspace.yaml` to this repo - it is a single-package app. If one appears, delete it.
- `ignoredBuiltDependencies` belongs in the `pnpm` block inside `package.json`, not in workspace config.
- `packageManager` in `package.json` must be pinned to the exact installed version (for example `pnpm@10.33.0`), not a range.
- CI pnpm version in `.github/workflows/ci.yml` must match the local installed version exactly.

## Performance Baselines (E.5 audit - April 2026)
Achieved on production Vercel deploy:
- Desktop: LCP 0.4s, CLS 0.005, TBT 80ms, TTFB ~0ms
- Mobile: LCP ~1.4s (target <2.5s), TBT 60ms, CLS 0
- Accessibility: 100, Best Practices: 100 (after HTTPS fix), SEO: 100
Remaining Phase F work: unused JS bundle splitting (233 KiB), render-blocking CSS chunk, legacy polyfills.

## Folder contract
/src/app              -> Next.js App Router pages
/src/components       -> stateless UI atoms and molecules
/src/features         -> domain modules (properties, auth, agents, inquiries, favorites)
/src/lib/api          -> central apiClient - all network calls live here
/src/hooks            -> shared hooks across features
/src/types            -> api.generated.ts + extensions
/src/styles           -> global CSS and Tailwind base

## Backend
Running locally at http://localhost:8000
Health check: GET /health -> {"status": "ok"}
OpenAPI schema: http://localhost:8000/api/v1/openapi.json
Type generation: pnpm gen:types

## Deferred items
- Seed property data needed before D.5 listing feed is meaningful

## Current phase
Phase E - Staging validation and first deploy. E.1-E.4 closed. E.5 Lighthouse audit in progress.
Backend production API: `https://realtornet-production.up.railway.app`

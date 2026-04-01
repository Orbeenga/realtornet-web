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
D.4 - UI system (shared primitives)

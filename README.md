# RealtorNet Frontend

Frontend for the RealtorNet property marketplace. The app is built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, TanStack Query, Supabase auth helpers, and Sentry.

## Current Phase Status

- Phase E in progress - staging validation and first deploy
- E.1 closed: Supabase prod live (project `umhtnqxdvffpifqbdtjs`, EU West, 54 RLS policies)
- E.2 closed: Railway backend live at `https://realtornet-production.up.railway.app`
- E.3 closed: Vercel frontend deployed at `https://realtornet-web.vercel.app`
- E.4 closed: GitHub Actions CI green on PRs to `main`
- E.5 in progress: Lighthouse audit - desktop all green, mobile LCP fix deployed

## Setup

1. Install dependencies with `pnpm install`.
2. Create the environment files required for local development.
3. Start the dev server with `pnpm dev`.
4. Open `http://localhost:3000`.

The frontend expects these environment values:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SENTRY_DSN` for runtime error reporting when enabled
- `SENTRY_AUTH_TOKEN` for CI source-map upload when enabled

Additional environment notes live in [docs/env.md](/c:/Users/Apine/realtornet-web/docs/env.md).

## Quality Checks

- Type check: `pnpm tsc --noEmit`
- Lint: `pnpm lint`
- Production build: `pnpm build`

The GitHub Actions workflow already runs the same typecheck, lint, and build commands used locally.

## Frontend Notes

- Browser API calls use frontend-origin `/api/v1/*` routes and are rewritten to the backend origin in `next.config.ts`.
- The shared API client owns URL construction and auth-aware request handling.
- Listing cards, detail pages, and My Listings fetch property images from the property-images endpoints instead of assuming image URLs on property payloads.
- The app uses a system font stack instead of hosted Google Fonts.

## Documentation

- [CHANGELOG.md](/c:/Users/Apine/realtornet-web/CHANGELOG.md)
- [docs/DEFERRED.md](/c:/Users/Apine/realtornet-web/docs/DEFERRED.md)
- [docs/env.md](/c:/Users/Apine/realtornet-web/docs/env.md)
- [docs/ui-specs/form-field-standards.md](/c:/Users/Apine/realtornet-web/docs/ui-specs/form-field-standards.md)

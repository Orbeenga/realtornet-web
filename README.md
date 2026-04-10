# RealtorNet Frontend

Frontend for the RealtorNet property marketplace. The app is built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, TanStack Query, Supabase auth helpers, and Sentry.

## Current Phase Status

Phase D frontend work is substantially complete through D.7.4:

- D.7.1 Property image upload UI: closed
- D.7.2 Saved searches: closed and browser-verified
- D.7.3 Sentry integration: wired and verified
- D.7.4 Lighthouse audit: run and documented
- Amenities selector: implemented and rendering
- Frontend API calls: routed through the Next.js proxy rewrite and centralized `apiClient` URL building
- UI standards: system font stack applied, form-field standards documented, account page layout standards applied globally
- Image handling: feed and My Listings image display aligned with property-images endpoints
- Storage integration notes: MIME type, admin client, and upsert-safe expectations captured in docs

D.7.5 is still blocked locally on Windows because `next build` can fail with `spawn EPERM` during page data collection. That issue is environmental rather than a frontend code bug. D.7.6 and D.7.7 remain pending the build unblock.

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

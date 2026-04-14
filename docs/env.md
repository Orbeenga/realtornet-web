# Environment Variables

`.env.production` is gitignored and must never be committed.

`.env.production.example` is the committed reference for the production environment file format.

For CI, add secrets in GitHub under `Settings -> Secrets and variables -> Actions`.

| Variable | Purpose | Where to find the value | Required in CI secrets |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Public base URL used by the frontend for API requests. | Your deployed backend/API base URL for the target environment. | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the frontend client. | Supabase dashboard for the target project. | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous Supabase key used by the frontend client. | Supabase dashboard API settings for the target project. | Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Public DSN used by the frontend to send Sentry events. | Sentry project settings for the frontend project. | No |
| `SENTRY_AUTH_TOKEN` | Auth token used for Sentry source map upload in environments where uploads are enabled. | Sentry organization auth token settings. | No |

## Notes

- Keep real production values in `.env.production` locally or in your deployment platform secrets.
- Commit `.env.production.example`, not `.env.production`.
- GitHub Actions secrets should mirror the values needed by the workflow build step.

## pnpm Operational Rules

- This is a single-package repo. Do not create `pnpm-workspace.yaml`.
- `ignoredBuiltDependencies` must be declared in the `pnpm` block inside `package.json`.
- `packageManager` must be pinned to the exact installed version: `pnpm@10.33.0`.
- CI workflow pnpm version must match local exactly - check with `pnpm --version` before updating.
- If Vercel build logs show `Ignored build scripts: @sentry/cli, esbuild, msw` - this is expected and harmless. Run `pnpm approve-builds` locally if native binaries need updating.

## HTTPS Enforcement

- `NEXT_PUBLIC_API_URL` must always be `https://` - never `http://`.
- The API client (`src/lib/api/client.ts`) and Next.js config (`next.config.ts`) both enforce HTTPS via `.replace(/^http:\/\//, 'https://')`. Do not remove these guards.
- Mixed content (`http://` requests from an `https://` page) is blocked by browsers and will silently break API calls.

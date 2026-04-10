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

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend Agent Instructions

## API Layer Rules

- No `fetch()` calls inside components; use hooks in `/features/*/hooks/`.
- API calls go through `apiClient`, which injects the Bearer token.
- API response types come from `src/types/api.generated.ts`; do not hand-roll response interfaces.
- `ApiError` normalizes error shape as `status`, `detail`, and `fieldErrors`.
- Run `pnpm gen:types` against `https://realtornet-production.up.railway.app` after every backend contract change.

## Type Generation

```powershell
$env:NEXT_PUBLIC_API_URL='https://realtornet-production.up.railway.app'
pnpm gen:types
```

## Quality Gates

- `pnpm gen:types`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- Lighthouse mobile on `/agencies` when a phase touches public discovery, navigation, or page weight.

## Bundle Notes

- `PropertiesExplorer` remains dynamically loaded through the client shell.
- Zod and React Hook Form are kept off non-form discovery routes.
- Toast initialization is deferred.
- React Query Devtools are removed from production.
- `.browserslistrc` targets modern browsers.
- I.6 confirmed mobile TBT below 300ms on `/properties`, `/agencies`, and `/agents`.
- Keep agency/agent stats, property card enhancements, and secondary filter option data out of first mobile interactivity.

## Secret handling

- Staging credentials live only in the vault. Read `C:\Users\Apine\realtornet\.secrets\staging-credentials.local.md` for current staging values. Use them for local browser verification, API checks, and test execution. Never copy their contents into tracked files, commit them, or paste them into GitHub or chat.
- See backend `SOP.md` §Secrets and local credential access for the full procedure.

# RealtorNet - Frontend Claude Context
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 is deployed on Vercel. Phase G is closed through G.7 Integration & Exit; Phase H opens next.

## Navigation Contract (Locked - Reference `src/features/auth/navigation.ts`)

| Role | Navbar items | Post-login redirect |
|---|---|---|
| Logged out | Agencies, Properties | n/a |
| Seeker | Agencies, Properties, My Agencies, Favorites, Saved searches, My Inquiries | `/properties` |
| Agent | Agencies, Properties, My Agencies, My Listings, Inquiries, Favorites | `/account/listings` |
| Agency owner | Agencies, Properties, My Listings, Inquiries, Favorites, Agency dashboard | `/account/agency` |
| Admin | Properties, Agencies, Property moderation, Users, Inquiries, Agencies admin | `/account/listings` |

- `agency_owner` receives agent-style navigation plus `/account/agency`.
- `/account/listings` admits `agent`, `agency_owner`, and `admin` where page-level role gates allow it.
- `/account/agency` is agency-owner only.
- `/account/users` and `/account/admin/agencies` are admin only.
- `/account/join-requests` is the user-facing "My Agencies" surface for seeker and agent agency activity.

## API Layer Rules

- No `fetch()` calls inside components; use hooks in `/features/*/hooks/`.
- API calls go through `apiClient`, which injects the Bearer token and preserves trailing slashes.
- API response types come from `src/types/api.generated.ts`; do not hand-roll response interfaces.
- `ApiError` normalizes error shape as `status`, `detail`, and `fieldErrors`.
- Run `pnpm gen:types` against `https://realtornet-production.up.railway.app` after every backend contract change.

## Phase G Closed Scope

- Agency-first landing page and public hierarchy are live: Agencies -> Listings -> Agents.
- Public agency directory, agency profile, agent roster, and agency listings are live.
- Agency application form includes `website_url` and admin approval/rejection UI.
- Seeker join-request flow is live, including personal history on `/account/join-requests`.
- Agent invitation flow is live, including persistent invited-user inbox with accept/reject actions.
- Agency owner dashboard is live with profile summary, join-request review, roster management, sent invitations, and invite-by-email.
- Agency membership management is wired for suspend, revoke, block, restore, and review decision actions.
- Admin agencies page uses pending/approved tabs with approve, reject, revoke, and suspend actions.

## Bundle Notes

- `PropertiesExplorer` remains dynamically loaded through the client shell.
- Toast initialization is deferred.
- React Query Devtools are removed from production.
- `.browserslistrc` targets modern browsers.
- Residual `core-js` can still appear from third-party dependencies; track under future dependency audit, not Phase G exit.

## Latest G.7 Validation

- `pnpm gen:types` against production Railway completed and left generated API types current.
- `pnpm exec tsc --noEmit` completed with 0 errors.
- `pnpm build` completed cleanly on Next.js 16.2.1 with no warnings in the build output.
- Lighthouse mobile on `/agencies`: LCP 1.5s, accessibility 1.00, performance 0.92, CLS 0.
- Production route walkthrough returned HTTP 200 with content for `/`, `/agencies/`, `/agencies/1/`, `/agencies/apply/`, `/account/join-requests/`, `/account/agency/`, and `/account/admin/agencies/`.

## Open Bugs

- No Phase G exit-blocking frontend bugs are open after G.7 validation.
- Production data breadth remains a seed/data concern for locations and property types.

## Type Generation

```bash
$env:NEXT_PUBLIC_API_URL='https://realtornet-production.up.railway.app'
pnpm gen:types
```

## Quality Gates

- `pnpm exec tsc --noEmit`
- `pnpm build`
- Lighthouse mobile on `/agencies` when a phase touches public discovery, navigation, or page weight.

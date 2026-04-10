# Changelog

All notable changes to the RealtorNet frontend are documented in this file.

## [0.2.0] - 2026-04-10

### Added
- Closed D.7.1 with the agent-facing property image upload manager, including upload, reorder, set-primary, and delete controls on listing edit flows.
- Closed D.7.2 with saved searches on `/account/saved-searches`, including create, list, run, and delete flows through the centralized API client and browser verification.
- Added amenity selection to listing creation and editing flows, with synced property amenity updates and rendering on the edit surface.
- Added Sentry runtime instrumentation for client, server, edge, and global error capture.

### Changed
- Routed frontend API traffic through the Next.js proxy rewrite so browser requests stay on frontend-origin `/api/v1/*` paths.
- Centralized API URL construction in `apiClient`, allowing hooks and features to build requests from one path helper.
- Removed hosted Google font usage in favor of the shared system font stack.
- Applied the account page width/layout standard across saved searches, inquiries, and listing management surfaces.
- Updated property cards and My Listings rows to fetch and render listing images from the property-images endpoints.

### Fixed
- Wired listing image rendering and upload behavior to the current property image API contract.
- Documented and aligned storage handling expectations around MIME typing, admin-client uploads, and upsert-safe behavior.
- Verified Sentry build wiring for CI/source-map upload behavior without enabling the local Windows failure mode.

### Audit
- Recorded the latest Lighthouse audit run and documented the current result state in project records for Phase D.

### Known Issues
- D.7.5 remains blocked locally on Windows because `next build` can fail with `spawn EPERM` during page data collection. This is an environment/process-spawn issue, not a frontend code defect. Three resolution paths were documented in the session handover, and D.7.6-D.7.7 remain pending that unblock.

## Phase E Deferrals

| ID | Item | Phase |
|---|---|---|
| DEF-FE-001 | Mobile LCP optimisation - LCP element is a <p> CTA tag, target <2.5s not met on mobile (current: 4.4s) | Phase F |
| DEF-FE-002 | TBT reduction - 304 KiB unused JS on initial load, TBT 270ms desktop / 130ms mobile (target <100ms) | Phase F |
| DEF-FE-003 | Sentry deferred initialisation - blocking ~300ms on mobile LCP | Phase F |
| DEF-FE-004 | Legacy JS polyfills - Array.prototype.at, Object.hasOwn etc being shipped unnecessarily | Phase F |
| DEF-FE-005 | CSS render-blocking chunk (12.5 KiB) on critical path | Phase F |
| DEF-FE-006 | Mobile TBT 250ms (target <100ms) - PropertiesExplorer client bundle needs deeper code splitting | Phase F |
| DEF-FE-007 | Select elements missing associated labels in filter UI - accessibility fix needed | Phase F |
| DEF-F4-TBT | TBT exit criterion revised. Original target: <100ms desktop and mobile. Revised target: <300ms desktop and mobile. Rationale: Next.js 16 framework baseline + React hydration floor makes 100ms unachievable at this bundle size without architectural changes (RSC migration, islands pattern) that are out of scope for Phase F. Current state: ~800ms median - further reduction attempted via PropertiesExplorer code split and bundle cleanup. Remaining gap is framework baseline, not addressable in Phase F. Promoted to Phase G for RSC evaluation. | Phase G |

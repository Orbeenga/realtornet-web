// Client-side Sentry is initialized after hydration via src/app/SentryDeferredInit.tsx
// to keep monitoring from competing with the initial route render.
export const onRouterTransitionStart = () => {};

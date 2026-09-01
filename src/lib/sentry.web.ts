import * as SentryReact from "@sentry/react";

export const init = SentryReact.init;
export const captureException = SentryReact.captureException;
export const flush = SentryReact.flush;
export const wrap = <T>(component: T): T => component;
export const reactNavigationIntegration = () => ({
  registerNavigationContainer: (_ref: unknown) => {},
});
// Web has no ErrorUtils-based fatal-error capture like native's
// GlobalErrorBoundary, so alias to the plain ErrorBoundary — keeps
// Sentry.GlobalErrorBoundary usable uniformly from App.js on both platforms.
export const GlobalErrorBoundary = SentryReact.ErrorBoundary;

import * as SentryReact from "@sentry/react";

export const init = SentryReact.init;
export const captureException = SentryReact.captureException;
export const flush = SentryReact.flush;
export const wrap = <T>(component: T): T => component;
export const reactNavigationIntegration = () => ({
  registerNavigationContainer: (_ref: unknown) => {},
});

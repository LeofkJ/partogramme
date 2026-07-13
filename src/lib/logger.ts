import * as Sentry from "./sentry";

type LogLevel = "debug" | "info" | "warn" | "error";

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info:  "\x1b[32m", // green
  warn:  "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!__DEV__) return;

  const color = COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET}`;
  const time = new Date().toLocaleTimeString();

  if (context) {
    console.log(`${prefix} ${time} — ${message}`, context);
  } else {
    console.log(`${prefix} ${time} — ${message}`);
  }

  if (level === "error") {
    Sentry.captureException(new Error(message));
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info:  (message: string, context?: Record<string, unknown>) => log("info",  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => log("warn",  message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};

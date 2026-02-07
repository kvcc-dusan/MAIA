// Simple logger utility to wrap console and enable future extension

const isDev = import.meta.env.DEV;

export const logger = {
  info: (message, ...args) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error);
    // Future: send to Sentry/LogRocket
  },
  debug: (message, ...args) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};

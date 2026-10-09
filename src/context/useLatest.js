import { useEffect, useRef } from "react";

/**
 * Ref that always holds the value from the latest committed render. Actions
 * read it for logging only (never for the state change itself, which stays a
 * functional updater), so a stale read can cost a log line but never data.
 */
export const useLatest = (value) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
};

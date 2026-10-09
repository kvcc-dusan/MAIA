import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Which Opus tab is showing, plus the one-shot hints a navigation carries.
 *
 * Any panel can jump to another tab with a filter already applied:
 *   navigate("tasks", { status: "blocked" })
 * `params` is a plain object, replaced (never merged) on every navigate, and a
 * tab click calls navigate(tab) so it always arrives empty. A navigate to the
 * current tab still yields a new `params` object, so a panel that is already
 * mounted can react to it with an effect on `params`.
 */
const FALLBACK = { tab: null, params: {}, navigate: () => {} };

const OpusNavContext = createContext(null);

/**
 * `tabs` is the list of valid ids; unknown ids passed to navigate are ignored.
 * `onTabChange` lets the owner persist the choice without this file knowing how.
 */
export function OpusNavProvider({ tabs, initialTab, onTabChange, children }) {
  const [state, setState] = useState({ tab: tabs.includes(initialTab) ? initialTab : tabs[0], params: {} });

  const navigate = useCallback((tab, params = {}) => {
    if (!tabs.includes(tab)) return;
    setState({ tab, params });
    onTabChange?.(tab);
  }, [tabs, onTabChange]);

  const value = useMemo(() => ({ ...state, navigate }), [state, navigate]);
  return <OpusNavContext.Provider value={value}>{children}</OpusNavContext.Provider>;
}

/** Outside a provider (a panel in a unit test, the gallery) this is inert instead of throwing. */
// eslint-disable-next-line react-refresh/only-export-components
export function useOpusNav() {
  return useContext(OpusNavContext) ?? FALLBACK;
}

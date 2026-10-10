import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useData } from "@/context/DataContext.jsx";
import { getRecentVaults, getVaultPath, isTauri, pickVaultFolder, pushRecentVault } from "@/lib/vault";

const MAX_SHOWN_RECENTS = 5;
const RECENTS_KEY = "maia.recentVaults";

// vault.js writes straight to localStorage, so the vault path and the recents
// have no change event of their own. This tiny store gives React one, and holds
// the switch status so the rail menu and the settings screen agree.
const listeners = new Set();
let status = { isSwitching: false, error: null };

const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const setStatus = (next) => {
  status = next;
  emit();
};

const readPath = () => {
  try {
    return getVaultPath();
  } catch {
    return null;
  }
};

const readRecentsRaw = () => {
  try {
    return localStorage.getItem(RECENTS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

const messageOf = (e) => (e instanceof Error ? e.message : String(e));

/**
 * The vault the app is working in, the recent ones, and the actions to move
 * between them. Switching goes through `notesMeta.switchVault`, which writes
 * pending edits to the old vault first and never copies notes across.
 */
export const useVault = () => {
  const { notesMeta } = useData();
  const path = useSyncExternalStore(subscribe, readPath, () => null);
  const recentsRaw = useSyncExternalStore(subscribe, readRecentsRaw, () => "[]");
  const current = useSyncExternalStore(subscribe, () => status, () => status);

  // recentsRaw is the change signal; the list itself is validated by vault.js.
  const recents = useMemo(
    () => getRecentVaults().filter((p) => p !== path).slice(0, MAX_SHOWN_RECENTS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentsRaw is the storage signal for getRecentVaults
    [recentsRaw, path]
  );

  const switchTo = useCallback(
    async (next) => {
      if (!next || next === readPath() || status.isSwitching) return false;
      const previous = readPath();
      setStatus({ isSwitching: true, error: null });
      try {
        await notesMeta.switchVault(next);
        if (previous) pushRecentVault(previous);
        pushRecentVault(next);
        setStatus({ isSwitching: false, error: null });
        return true;
      } catch (e) {
        console.error("[MAIA] Vault switch failed", e);
        setStatus({
          isSwitching: false,
          error: `Could not open "${next}". ${messageOf(e)} Check that the folder still exists and is reachable, or pick another folder.`,
        });
        return false;
      }
    },
    [notesMeta]
  );

  const pickAndSwitch = useCallback(async () => {
    try {
      const picked = await pickVaultFolder();
      if (!picked) return null; // dialog dismissed: not a failure
      return await switchTo(picked);
    } catch (e) {
      console.error("[MAIA] Vault folder pick failed", e);
      setStatus({ isSwitching: false, error: `Could not open the folder picker. ${messageOf(e)}` });
      return false;
    }
  }, [switchTo]);

  const clearError = useCallback(() => setStatus({ ...status, error: null }), []);

  return {
    isDesktop: isTauri(),
    path,
    recents,
    isSwitching: current.isSwitching,
    error: current.error,
    switchTo,
    pickAndSwitch,
    clearError,
  };
};

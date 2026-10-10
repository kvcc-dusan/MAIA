import { toast } from 'sonner';

// Codes come from `open_in_default_app` in src-tauri/src/lib.rs.
const MESSAGES = {
  missing: 'That file is not in your vault any more.',
  not_a_file: 'That is a folder, not a file.',
  blocked_type: 'MAIA will not open programs or scripts. Open it from Finder if you trust it.',
  outside_vault: 'That file is outside your vault.',
  open_failed: 'Your system could not open that file.',
};
const FALLBACK = 'Could not open that file.';

const joinVaultPath = (vault, rel) => `${vault.replace(/[\\/]+$/, '')}/${rel}`;

/** Opens a vault file in the OS default app. Resolves true when the system took it. */
export const openVaultFile = async (vault, rel, { invokeFn } = {}) => {
  if (!vault || !rel) return false;
  if (!invokeFn && !(typeof window !== 'undefined' && window.__TAURI_INTERNALS__)) {
    toast.error('Opening files needs the desktop app.');
    return false;
  }
  try {
    // dynamic: the web bundle must not pull in Tauri code
    const invoke = invokeFn ?? (await import('@tauri-apps/api/core')).invoke;
    await invoke('open_in_default_app', { path: joinVaultPath(vault, rel) });
    return true;
  } catch (e) {
    const code = typeof e === 'string' ? e : e?.message;
    if (!MESSAGES[code]) console.error('[MAIA] open_in_default_app failed', e);
    toast.error(MESSAGES[code] ?? FALLBACK);
    return false;
  }
};

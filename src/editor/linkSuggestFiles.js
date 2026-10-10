import { getVaultPath, isTauri } from '../lib/vault.js';
import { getVaultFileIndex } from '../lib/vaultFiles.js';

/** Vault file paths for `![[` suggestions. Empty on the web, where there is no file index. */
export const listVaultFilePaths = async () => {
  const vault = isTauri() ? getVaultPath() : null;
  if (!vault) return [];
  try {
    return (await getVaultFileIndex(vault)).paths;
  } catch (e) {
    // suggestions fall back to notes only; the embed itself reports a missing file
    console.error('[MAIA] Could not list vault files for suggestions', e);
    return [];
  }
};

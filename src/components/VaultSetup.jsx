import React, { useState, useCallback } from "react";
import { useData } from "../context/DataContext.jsx";
import {
  isTauri,
  getVaultPath,
  setVaultPath,
  pickVaultFolder,
  migrateFromLocalStorage,
  isMigrated,
} from "../lib/vault.js";
import { STORAGE_KEYS } from "../lib/constants.js";

/**
 * Tauri-only overlay: first-run vault folder picking + one-time migration
 * of localStorage notes into the vault. Also handles a missing/moved vault.
 */
export default function VaultSetup() {
  const { notesMeta } = useData();
  const [isBusy, setIsBusy] = useState(false);
  const [migrationError, setMigrationError] = useState(null);

  const handlePick = useCallback(async () => {
    setIsBusy(true);
    setMigrationError(null);
    try {
      const folder = await pickVaultFolder();
      if (!folder) return;
      setVaultPath(folder);

      if (!isMigrated()) {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
          const existing = raw ? JSON.parse(raw) : [];
          if (Array.isArray(existing) && existing.length > 0) {
            await migrateFromLocalStorage(folder, existing);
          }
        } catch (e) {
          console.error("[MAIA] Note migration failed", e);
          setMigrationError(e);
          return;
        }
      }
      notesMeta.reload();
    } finally {
      setIsBusy(false);
    }
  }, [notesMeta]);

  if (!isTauri()) return null;
  if (notesMeta.status === "ready") return null;
  if (notesMeta.status === "loading") {
    return (
      <div className="fixed inset-0 z-200 flex items-center justify-center bg-black">
        <span className="font-mono text-xs uppercase tracking-widest text-white/40 animate-pulse">
          Opening vault…
        </span>
      </div>
    );
  }

  const isError = notesMeta.status === "error" || migrationError;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black font-sans text-white">
      <div className="glass-panel flex w-[min(90vw,28rem)] flex-col gap-5 rounded-[24px] border border-border bg-black/80 p-8 backdrop-blur-xl">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {isError ? "Vault unavailable" : "Choose your vault"}
          </h2>
          <p className="text-sm leading-relaxed text-white/60">
            {isError
              ? `MAIA couldn't open the vault${getVaultPath() ? ` at "${getVaultPath()}"` : ""}. The folder may have moved or be offline.`
              : "Pick a folder where your notes will live as plain markdown files — readable by Obsidian, synced by iCloud, owned by you."}
          </p>
          {migrationError && (
            <p className="text-xs text-red-400/80">
              Migration failed: {String(migrationError.message || migrationError)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePick}
            disabled={isBusy}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-white/85 disabled:opacity-50"
          >
            {isBusy ? "Working…" : isError ? "Pick vault folder" : "Choose folder"}
          </button>
          {isError && (
            <button
              type="button"
              onClick={() => notesMeta.reload()}
              disabled={isBusy}
              className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:bg-overlay disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

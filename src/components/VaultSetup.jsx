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
import { Button } from "./arc/button/button";
import { Alert } from "./arc/alert/alert";
import styles from "./VaultSetup.module.css";

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
      <div className={`${styles.gate} z-dialog`} role="status" aria-busy="true">
        <span className={styles.loading}>Opening vault…</span>
      </div>
    );
  }

  const isError = notesMeta.status === "error" || migrationError;

  return (
    <div
      className={`${styles.gate} z-dialog`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-setup-title"
    >
      <div className={styles.panel}>
        <div className={styles.copy}>
          <h2 id="vault-setup-title" className={styles.title}>
            {isError ? "Vault unavailable" : "Choose your vault"}
          </h2>
          <p className={styles.body}>
            {isError
              ? `MAIA couldn't open the vault${getVaultPath() ? ` at "${getVaultPath()}"` : ""}. The folder may have moved or be offline.`
              : "Pick a folder where your notes will live as plain markdown files, readable by Obsidian, synced by iCloud, owned by you."}
          </p>
        </div>
        {migrationError && (
          <Alert tone="danger" title="Migration failed">
            {String(migrationError.message || migrationError)}
          </Alert>
        )}
        <div className={styles.actions}>
          <Button onClick={handlePick} loading={isBusy}>
            {isError ? "Pick vault folder" : "Choose folder"}
          </Button>
          {isError && (
            <Button variant="secondary" onClick={() => notesMeta.reload()} disabled={isBusy}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

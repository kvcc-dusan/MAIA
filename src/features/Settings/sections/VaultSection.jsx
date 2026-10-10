import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { vaultName } from "@/lib/vault";
import { SettingGroup, SettingRow } from "../SettingRow";
import { useVault } from "../useVault";
import styles from "./Sections.module.css";

const WebVault = () => (
  <SettingGroup title="Storage">
    <SettingRow
      label="This browser"
      description="Your notes live in this browser's local storage. Vaults, plain markdown folders you can open in other apps, need the MAIA desktop app."
    />
  </SettingGroup>
);

const DesktopVault = () => {
  const { path, recents, isSwitching, error, switchTo, pickAndSwitch, clearError } = useVault();

  return (
    <>
      {error && (
        <div className={styles.alert}>
          <Alert tone="danger" title="Could not switch vault" onDismiss={clearError}>
            {error}
          </Alert>
        </div>
      )}
      {isSwitching && (
        <div className={styles.alert}>
          <Alert tone="info" title="Switching vault">
            Saving your latest edits, then opening the new folder.
          </Alert>
        </div>
      )}
      <SettingGroup title="Current vault">
        <SettingRow
          label={path ? vaultName(path) : "No vault chosen"}
          description={
            path ??
            "Choose a folder and MAIA loads its markdown notes."
          }
        >
          <Button variant="secondary" onClick={pickAndSwitch} disabled={isSwitching}>
            Change vault folder
          </Button>
        </SettingRow>
        <SettingRow
          label="How it works"
          description="The vault is the folder you work in. Every note is a markdown file in it, so other apps can read them. Switching vaults never copies notes between folders."
        />
      </SettingGroup>
      <SettingGroup title="Recent vaults">
        {recents.length === 0 ? (
          <p className={styles.empty}>No other vaults yet. Folders you open will be listed here.</p>
        ) : (
          recents.map((recent) => (
            <SettingRow key={recent} label={vaultName(recent)} description={recent}>
              <Button
                variant="secondary"
                aria-label={`Switch to ${vaultName(recent)}`}
                disabled={isSwitching}
                onClick={() => switchTo(recent)}
              >
                Switch
              </Button>
            </SettingRow>
          ))
        )}
      </SettingGroup>
    </>
  );
};

export const VaultSection = () => {
  const { isDesktop } = useVault();
  return isDesktop ? <DesktopVault /> : <WebVault />;
};

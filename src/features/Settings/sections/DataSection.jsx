import { Button } from "@/components/arc/button/button";
import { SettingGroup, SettingRow } from "../SettingRow";

export const DataSection = ({ onExportBackup, onImportBackup, onClose }) => {
  // The restore confirmation lives in App, so settings steps aside instead of stacking two dialogs.
  const handleImport = () => {
    onImportBackup?.();
    onClose?.();
  };

  return (
    <SettingGroup title="Backup">
      <SettingRow
        label="Export backup"
        description="Save one JSON file with your notes, projects, tasks, reminders, sessions, ledger and activity log."
      >
        <Button variant="secondary" onClick={() => onExportBackup?.()}>Export backup</Button>
      </SettingRow>
      <SettingRow
        label="Import backup"
        description="Replace everything in MAIA with the contents of a backup file. You confirm before anything changes."
      >
        <Button variant="secondary" onClick={handleImport}>Import backup</Button>
      </SettingRow>
    </SettingGroup>
  );
};

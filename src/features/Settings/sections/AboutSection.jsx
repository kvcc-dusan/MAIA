import pkg from "../../../../package.json";
import { SettingGroup, SettingRow } from "../SettingRow";
import { formatShortcut } from "../platform";
import styles from "./Sections.module.css";

const SHORTCUTS = [
  { keys: "K", label: "Search" },
  { keys: "N", label: "New note" },
  { keys: "O", label: "Go to file" },
  { keys: ",", label: "Settings" },
];

export const AboutSection = () => {
  return (
    <>
      <SettingGroup title="MAIA">
        <SettingRow label="Version" description="The build you are running.">
          <span className={styles.value}>{pkg.version}</span>
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Credits">
        <SettingRow label="Icons" description="Solar icon set by 480 Design, licensed CC BY 4.0.">
          <span className={styles.value}>Solar</span>
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Keyboard shortcuts">
        {SHORTCUTS.map(({ keys, label }) => (
          <SettingRow key={label} label={label}>
            <kbd className={styles.kbd}>{formatShortcut(keys)}</kbd>
          </SettingRow>
        ))}
      </SettingGroup>
    </>
  );
};

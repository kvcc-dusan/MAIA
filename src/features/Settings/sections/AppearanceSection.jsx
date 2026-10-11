import { useSyncExternalStore } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { getTheme, resolveTheme, setTheme, subscribe } from "@/lib/theme";
import { SettingGroup, SettingRow } from "../SettingRow";
import styles from "./Sections.module.css";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "black", label: "Black" },
];

const THEME_NOTES = {
  system: "Follows your operating system and switches with it.",
  light: "Always light, whatever your system uses.",
  dark: "Always dark, whatever your system uses.",
  black: "Pure black with white text, whatever your system uses.",
};

export const AppearanceSection = () => {
  const mode = useSyncExternalStore(subscribe, getTheme, () => "system");
  const showing = resolveTheme(mode);

  return (
    <SettingGroup title="Theme">
      <SettingRow label="Color theme" description="Choose how MAIA looks.">
        <SegmentedControl label="Color theme" options={THEME_OPTIONS} value={mode} onValueChange={setTheme} />
      </SettingRow>
      <p className={styles.note} aria-live="polite">
        {THEME_NOTES[mode]} Showing {mode === "black" ? "black" : showing} now.
      </p>
    </SettingGroup>
  );
};

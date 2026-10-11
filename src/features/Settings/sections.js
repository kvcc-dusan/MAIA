import { Database, Info, Palette, FolderOpen } from "@/components/icons";
import { AboutSection } from "./sections/AboutSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { DataSection } from "./sections/DataSection";
import { VaultSection } from "./sections/VaultSection";

/**
 * Settings sections, in display order. Adding one is one entry here plus one
 * component file in ./sections. A component receives the dialog's action props
 * (`onExportBackup`, `onImportBackup`, `onClose`) and takes what it needs.
 */
export const SETTINGS_SECTIONS = [
  { id: "appearance", label: "Appearance", icon: Palette, component: AppearanceSection },
  { id: "vault", label: "Vault", icon: FolderOpen, component: VaultSection },
  { id: "data", label: "Data and backup", icon: Database, component: DataSection },
  { id: "about", label: "About", icon: Info, component: AboutSection },
];

export const DEFAULT_SECTION_ID = SETTINGS_SECTIONS[0].id;

export const isSectionId = (id) => SETTINGS_SECTIONS.some((s) => s.id === id);

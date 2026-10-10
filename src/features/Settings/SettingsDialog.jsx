import { createElement, useEffect, useId, useRef, useState } from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { DEFAULT_SECTION_ID, isSectionId, SETTINGS_SECTIONS } from "./sections";
import styles from "./SettingsDialog.module.css";

const NEXT_KEYS = ["ArrowDown", "ArrowRight"];
const PREV_KEYS = ["ArrowUp", "ArrowLeft"];

/**
 * The settings screen: a section list on the left, the section on the right.
 * The list is a vertical tablist (one Tab stop, arrow keys move and select).
 * The open section is remembered while the app runs; `section` asks for a
 * specific one each time the dialog opens.
 */
export const SettingsDialog = ({ open, onClose, section, onExportBackup, onImportBackup }) => {
  const [activeId, setActiveId] = useState(DEFAULT_SECTION_ID);
  const baseId = useId();
  const tabRefs = useRef({});

  useEffect(() => {
    if (open && isSectionId(section)) setActiveId(section);
  }, [open, section]);

  const active = SETTINGS_SECTIONS.find((s) => s.id === activeId) ?? SETTINGS_SECTIONS[0];
  const ActiveSection = active.component;

  const handleKeyDown = (event) => {
    const index = SETTINGS_SECTIONS.findIndex((s) => s.id === active.id);
    const last = SETTINGS_SECTIONS.length - 1;
    let target = -1;
    if (NEXT_KEYS.includes(event.key)) target = index === last ? 0 : index + 1;
    else if (PREV_KEYS.includes(event.key)) target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target < 0) return;
    event.preventDefault();
    const next = SETTINGS_SECTIONS[target].id;
    setActiveId(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Settings"
      description="Change how MAIA looks, which folder it works in, and manage your data."
    >
      <div className={styles.layout}>
        <div
          className={styles.nav}
          role="tablist"
          aria-orientation="vertical"
          aria-label="Settings sections"
          onKeyDown={handleKeyDown}
        >
          {SETTINGS_SECTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              ref={(el) => { tabRefs.current[id] = el; }}
              id={`${baseId}-tab-${id}`}
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={id === active.id}
              aria-controls={`${baseId}-panel`}
              tabIndex={id === active.id ? 0 : -1}
              onClick={() => setActiveId(id)}
            >
              {createElement(icon, { size: 16, strokeWidth: 1.75, "aria-hidden": "true" })}
              {label}
            </button>
          ))}
        </div>
        <div
          className={styles.pane}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active.id}`}
        >
          <h3 className={styles.heading}>{active.label}</h3>
          <ActiveSection onExportBackup={onExportBackup} onImportBackup={onImportBackup} onClose={onClose} />
        </div>
      </div>
    </AppDialog>
  );
};

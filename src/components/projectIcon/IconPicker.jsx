import React, { useState } from "react";
import { Check } from "@/components/icons";
import { AppDialog } from "@/components/composed/AppDialog";
import { SectionLabel } from "@/components/composed/SectionBits";
import { Button } from "@/components/arc/button/button";
import { ICON_COLORS, PICKER_ICONS } from "@/lib/projectIcons.js";
import { cn } from "@/lib/utils";
import ProjectIcon from "../ProjectIcon";
import styles from "./IconPicker.module.css";

const PREVIEW_SIZE = 40;
const GRID_ICON_SIZE = 18;

// "ai_brain" -> "ai brain": ids are the persisted keys, not display copy.
const iconLabel = (id) => id.replace(/_/g, " ");

/**
 * Pick a project icon and accent. Calls onSelect(icon, color) on Apply, then
 * onClose. Rendered as its own dialog, so it can sit over another dialog.
 */
export default function IconPicker({ currentIcon, currentColor, onSelect, onClose }) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon || "code");
  const [selectedColor, setSelectedColor] = useState(currentColor || "white");

  const handleConfirm = () => {
    onSelect(selectedIcon, selectedColor);
    onClose();
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      size="sm"
      title="Choose icon"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Apply icon</Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.preview} aria-hidden="true">
          <ProjectIcon name={selectedIcon} size={PREVIEW_SIZE} color={selectedColor} />
        </div>

        <div className={styles.group} role="group" aria-labelledby="icon-picker-color">
          <SectionLabel id="icon-picker-color">Color</SectionLabel>
          <div className={styles.swatches}>
            {ICON_COLORS.map((c) => {
              const isActive = selectedColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={styles.swatchButton}
                  aria-label={c.label}
                  aria-pressed={isActive}
                  onClick={() => setSelectedColor(c.id)}
                >
                  <span className={styles.swatch} style={{ "--swatch": c.value }}>
                    {isActive && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.group} role="group" aria-labelledby="icon-picker-icon">
          <SectionLabel id="icon-picker-icon">Icon</SectionLabel>
          <div className={styles.grid}>
            {PICKER_ICONS.map((iconName) => {
              const isActive = selectedIcon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  className={cn(styles.cell, isActive && styles.cellActive)}
                  aria-label={iconLabel(iconName)}
                  aria-pressed={isActive}
                  onClick={() => setSelectedIcon(iconName)}
                >
                  <ProjectIcon name={iconName} size={GRID_ICON_SIZE} color={isActive ? selectedColor : undefined} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppDialog>
  );
}

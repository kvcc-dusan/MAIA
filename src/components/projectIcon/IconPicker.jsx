import React, { useRef, useState } from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { ICON_COLORS, PICKER_ICONS } from "@/lib/projectIcons.js";
import { cn } from "@/lib/utils";
import ProjectIcon from "../ProjectIcon";
import styles from "./IconPicker.module.css";

const GRID_ICON_SIZE = 20;
const GRID_COLUMNS = 6;

/**
 * Radio group keyboard handling: one Tab stop (the checked option), arrows move and select,
 * Home and End jump to the ends. In a grid, up and down move by a row; in a single row they act
 * like left and right, as in any radio group.
 */
const useRoving = (count, columns) => {
  const refs = useRef([]);
  const row = columns < count ? columns : 1;
  const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: row, ArrowUp: -row };
  const onKeyDown = (index, select) => (event) => {
    let next = null;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key in steps) next = index + steps[event.key];
    if (next === null || next < 0 || next >= count) return;
    event.preventDefault();
    select(next);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
};

/**
 * Pick a project icon and colour. The selected icon shows in the chosen colour, so it doubles as the preview.
 * Calls onSelect(icon, color) on Apply, then onClose.
 * Rendered as its own dialog, so it can sit over another dialog.
 */
export default function IconPicker({ currentIcon, currentColor, onSelect, onClose }) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon || "code");
  const [selectedColor, setSelectedColor] = useState(currentColor || "white");
  const colorNav = useRoving(ICON_COLORS.length, ICON_COLORS.length);
  const iconNav = useRoving(PICKER_ICONS.length, GRID_COLUMNS);

  // A project may carry an older icon that is not in the curated set: the first option then takes the Tab stop.
  const iconTabIndex = Math.max(0, PICKER_ICONS.findIndex((icon) => icon.id === selectedIcon));
  const colorTabIndex = Math.max(0, ICON_COLORS.findIndex((color) => color.id === selectedColor));

  const handleConfirm = () => {
    onSelect(selectedIcon, selectedColor);
    onClose();
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Choose icon"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Apply icon</Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.group}>
          <span id="icon-picker-color" className={styles.label}>Color</span>
          <div className={styles.swatches} role="radiogroup" aria-labelledby="icon-picker-color">
            {ICON_COLORS.map((color, index) => {
              const isActive = selectedColor === color.id;
              return (
                <button
                  key={color.id}
                  ref={(el) => { colorNav.refs.current[index] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={color.label}
                  tabIndex={index === colorTabIndex ? 0 : -1}
                  className={cn(styles.swatch, isActive && styles.swatchActive)}
                  onClick={() => setSelectedColor(color.id)}
                  onKeyDown={colorNav.onKeyDown(index, (i) => setSelectedColor(ICON_COLORS[i].id))}
                >
                  <span className={styles.dot} style={{ "--swatch": color.value }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.group}>
          <span id="icon-picker-icon" className={styles.label}>Icon</span>
          <div className={styles.grid} role="radiogroup" aria-labelledby="icon-picker-icon">
            {PICKER_ICONS.map((icon, index) => {
              const isActive = selectedIcon === icon.id;
              return (
                <button
                  key={icon.id}
                  ref={(el) => { iconNav.refs.current[index] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={icon.label}
                  title={icon.label}
                  tabIndex={index === iconTabIndex ? 0 : -1}
                  className={cn(styles.cell, isActive && styles.cellActive)}
                  onClick={() => setSelectedIcon(icon.id)}
                  onKeyDown={iconNav.onKeyDown(index, (i) => setSelectedIcon(PICKER_ICONS[i].id))}
                >
                  <ProjectIcon name={icon.id} size={GRID_ICON_SIZE} color={isActive ? selectedColor : undefined} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppDialog>
  );
}

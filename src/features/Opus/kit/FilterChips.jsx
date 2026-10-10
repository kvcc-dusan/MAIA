import React from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import styles from "./FilterChips.module.css";

/**
 * Single-select chips with optional counts. options: [{ value, label, count? }].
 * Arrow keys, Home and End move the selection (Arc segmented control).
 */
export default function FilterChips({ options, value, onValueChange, label }) {
  const mapped = options.map((option) => ({
    value: option.value,
    label: option.label,
    accessory: option.count == null ? undefined : <span className={styles.count}>{option.count}</span>,
  }));
  return (
    <SegmentedControl
      options={mapped}
      value={value}
      onValueChange={onValueChange}
      label={label}
      className={styles.root}
    />
  );
}

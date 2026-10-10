import React from "react";
import { STATUS_LABELS, ariaLabelFor, rangeText } from "./roadmapModel";
import styles from "./RoadmapGantt.module.css";

/** One bar or diamond marker. The status is always text; its colour is a second cue. */
export default function GanttItem({ item, isActive, referenceYear, onOpen, onFocusItem, onKeyDown }) {
  const label = ariaLabelFor(item, referenceYear);
  const style = {
    "--row": item.row,
    ...(item.kind === "bar" ? { "--l": item.left, "--w": item.width } : { "--c": item.center }),
  };
  return (
    <button
      type="button"
      className={styles.item}
      data-kind={item.kind}
      data-placement={item.placement}
      data-status={item.status}
      data-roadmap-item={item.id}
      style={style}
      tabIndex={isActive ? 0 : -1}
      aria-label={label}
      title={`${item.title}, ${rangeText(item, referenceYear)}`}
      onClick={() => onOpen(item.id)}
      onFocus={() => onFocusItem(item.id)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.shape} aria-hidden="true" />
      <span className={styles.label} aria-hidden="true">
        <span className={styles.title}>{item.title}</span>
        <span className={styles.tag}>
          <span className={styles.dot} />
          {STATUS_LABELS[item.status]}
        </span>
      </span>
    </button>
  );
}

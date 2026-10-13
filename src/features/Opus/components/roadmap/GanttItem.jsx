import React from "react";
import { ariaLabelFor, rangeText, statsText } from "./roadmapModel";
import styles from "./RoadmapGantt.module.css";

/** One bar, a pill for a bar too short for its name, or a pill for a milestone with only a due date. The status word lives in the legend and the aria-label; the bar keeps only its dot. */
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
      title={`${item.title}, ${rangeText(item, referenceYear)}. ${statsText(item.stats)}`}
      onClick={() => onOpen(item.id)}
      onFocus={() => onFocusItem(item.id)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.shape} aria-hidden="true">
        {/* Too short for its name: the pill fits the name and this tint marks the real start-to-due span. */}
        {item.placement === "outside" && <span className={styles.span} />}
        {item.placement === "inside" && item.stats.total > 0 && (
          <span className={styles.progress} style={{ "--p": item.stats.done / item.stats.total }} />
        )}
      </span>
      <span className={styles.label} aria-hidden="true">
        <span className={styles.title}>{item.title}</span>
        <span className={styles.dot} />
      </span>
    </button>
  );
}

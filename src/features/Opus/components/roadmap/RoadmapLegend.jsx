import React from "react";
import { STATUS_LABELS } from "./roadmapModel";
import styles from "./RoadmapLegend.module.css";

const STATUSES = ["planned", "active", "at-risk", "done"];

/** Status key for the pills: dot plus text, the same pairing the pills use. */
export default function RoadmapLegend() {
  return (
    <ul className={styles.root} aria-label="Milestone status">
      {STATUSES.map((status) => (
        <li key={status} className={styles.item} data-status={status}>
          <span className={styles.dot} aria-hidden="true" />
          {STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  );
}

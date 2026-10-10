import React from "react";
import { seriesColor, workstreamStatusLabel } from "./roadmapModel";
import WorkstreamMenu from "./WorkstreamMenu";
import styles from "./RoadmapList.module.css";

/** Narrow screens have no lanes, so workstreams get a list with the same menu. */
export default function WorkstreamList({ workstreams, onEdit, onDelete }) {
  if (workstreams.length === 0) return null;
  return (
    <section className={styles.group} aria-labelledby="roadmap-workstreams">
      <h3 id="roadmap-workstreams" className={styles.heading}>Workstreams</h3>
      <ul className={styles.list}>
        {workstreams.map((w) => (
          <li key={w.id} className={styles.wsRow}>
            <span className={styles.wsSwatch} style={{ background: seriesColor(w.color) }} aria-hidden="true" />
            <span className={styles.text}>
              <span className={styles.title}>{w.name}</span>
              <span className={styles.meta}>{[w.owner, workstreamStatusLabel(w.status)].filter(Boolean).join(", ")}</span>
            </span>
            <WorkstreamMenu workstream={w} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </section>
  );
}

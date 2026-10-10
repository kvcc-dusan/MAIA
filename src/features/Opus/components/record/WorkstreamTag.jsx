import React from "react";
import { workstreamColorVar } from "./workstreams";
import styles from "./record.module.css";

/** Workstream as a colored dot plus its name; the name carries the meaning, the dot is decoration. */
export default function WorkstreamTag({ workstream }) {
  if (!workstream) return null;
  const color = workstreamColorVar(workstream.color);
  return (
    <span className={styles.workstream}>
      <span className={styles.dot} style={color ? { "--ws-color": color } : undefined} aria-hidden="true" />
      <span className={styles.workstreamName}>{workstream.name}</span>
    </span>
  );
}

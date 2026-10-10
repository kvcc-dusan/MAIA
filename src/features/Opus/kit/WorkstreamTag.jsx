import React from "react";
import { workstreamColor } from "./format";
import styles from "./WorkstreamTag.module.css";

/** Colour dot plus the workstream name. Nothing when the workstream is missing. */
export default function WorkstreamTag({ workstream }) {
  if (!workstream) return null;
  return (
    <span className={styles.root}>
      <span className={styles.dot} style={{ background: workstreamColor(workstream) }} aria-hidden="true" />
      <span className={styles.name}>{workstream.name}</span>
    </span>
  );
}

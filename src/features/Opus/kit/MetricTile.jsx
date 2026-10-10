import React from "react";
import styles from "./MetricTile.module.css";

const DOT_TONES = { danger: styles.danger, warning: styles.warning, success: styles.success };

/**
 * One headline number. `unit` renders muted beside the value ("/60"),
 * `context` is the line under it, `tone` adds a status dot before the context
 * (the text always carries the meaning). `link` is { label, onClick }.
 */
export default function MetricTile({ label, value, unit, context, tone, link, children }) {
  return (
    <article className={styles.tile}>
      <h3 className={styles.label}>{label}</h3>
      <p className={styles.value}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </p>
      {children}
      {context ? (
        <p className={styles.context}>
          {tone ? <span className={`${styles.dot} ${DOT_TONES[tone] ?? ""}`} aria-hidden="true" /> : null}
          {context}
        </p>
      ) : null}
      {link ? (
        <button type="button" className={styles.link} onClick={link.onClick}>{link.label}</button>
      ) : null}
    </article>
  );
}

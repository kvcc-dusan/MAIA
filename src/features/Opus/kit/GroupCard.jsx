import React from "react";
import Progress from "@/components/arc/progress/progress";
import styles from "./GroupCard.module.css";

/**
 * A titled card: optional colour dot, meta text ("10 of 14 done"), optional
 * progress { value, max }, then the body. 1px border, no shadow.
 */
export default function GroupCard({ title, color, meta, progress, children }) {
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.title}>
          {color ? <span className={styles.dot} style={{ background: color }} aria-hidden="true" /> : null}
          <span className={styles.name}>{title}</span>
        </h3>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
        {progress ? (
          <Progress className={styles.progress} value={progress.value} max={progress.max} label={`${title} progress`} />
        ) : null}
      </header>
      {children ? <div className={styles.body}>{children}</div> : null}
    </section>
  );
}

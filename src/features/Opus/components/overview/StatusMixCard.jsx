import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import styles from "./Cards.module.css";

/** One stacked bar for the split, then a row per status with count and share. Rows carry text labels, so colour is never the only cue. */
export default function StatusMixCard({ mix }) {
  const total = mix.reduce((sum, s) => sum + s.value, 0);
  const summary = mix.filter((s) => s.value > 0).map((s) => `${s.value} ${s.label.toLowerCase()}`).join(", ");
  return (
    <SectionCard titleAs="h2" title="Status mix" bodyClassName={styles.body}>
      <p className={styles.mixTotal}>
        <span className={styles.mixTotalValue}>{total}</span> {total === 1 ? "task" : "tasks"}
      </p>
      {total === 0 ? (
        <p className={styles.quiet}>No tasks yet</p>
      ) : (
        <div className={styles.mixBar} role="img" aria-label={`Tasks by status: ${summary}`}>
          {mix.filter((s) => s.value > 0).map((s) => (
            <span key={s.key} className={styles.mixSegment} style={{ flexGrow: s.value, background: s.color }} />
          ))}
        </div>
      )}
      <ul className={styles.mixList}>
        {mix.map((s) => (
          <li key={s.key} className={styles.mixRow}>
            <span className={styles.dot} style={{ background: s.color }} aria-hidden="true" />
            <span className={styles.mixName}>{s.label}</span>
            <span className={styles.mixCount}>{s.value}</span>
            <span className={styles.mixPct}>{s.pct}%</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

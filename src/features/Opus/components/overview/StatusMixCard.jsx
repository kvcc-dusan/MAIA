import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { DonutChart } from "@/components/arc/donut-chart/donut-chart";
import styles from "./Cards.module.css";

/** Donut plus a list with counts and percentages. Rows carry text labels, so colour is never the only cue. */
export default function StatusMixCard({ mix }) {
  return (
    <SectionCard titleAs="h2" title="Status mix" bodyClassName={styles.body}>
      <DonutChart
        data={mix}
        label="Tasks by status"
        totalLabel="Tasks"
        unit="tasks"
        groupBelow={0}
        legend={false}
        emptyLabel="No tasks yet"
      />
      <ul className={styles.mixList}>
        {mix.map((s) => (
          <li key={s.key}>
            <div className={styles.mixRow}>
              <span className={styles.dot} style={{ background: s.color }} aria-hidden="true" />
              <span className={styles.mixName}>{s.label}</span>
              <span className={styles.mixCount}>{s.value}</span>
              <span className={styles.mixPct}>{s.pct}%</span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

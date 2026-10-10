import React from "react";
import { Badge } from "@/components/arc/badge/badge";
import { CountPill } from "@/components/composed/SectionBits";
import { STATUS_LABELS, STATUS_TONES, ariaLabelFor, rangeText, statsText } from "./roadmapModel";
import styles from "./RoadmapList.module.css";

function MilestoneRow({ milestone, referenceYear, onOpen }) {
  const meta = [milestone.workstreamName || "No workstream", rangeText(milestone, referenceYear)].join(", ");
  return (
    <li>
      <button
        type="button"
        className={styles.row}
        aria-label={ariaLabelFor(milestone, referenceYear)}
        onClick={() => onOpen(milestone.id)}
      >
        <span className={styles.text}>
          <span className={styles.title}>{milestone.title}</span>
          <span className={styles.meta}>{meta}</span>
          <span className={styles.meta}>{statsText(milestone.stats)}</span>
        </span>
        <Badge tone={STATUS_TONES[milestone.status]}>{STATUS_LABELS[milestone.status]}</Badge>
      </button>
    </li>
  );
}

/**
 * Milestones as plain buttons in titled groups: months on narrow screens,
 * "Unscheduled" under the Gantt. (Arc's timeline lists newest updates first
 * and its rows can't be activated, so it can't stand in for this.)
 */
export default function RoadmapList({ groups, referenceYear, onOpen }) {
  return (
    <div className={styles.root}>
      {groups.map((group) => (
        <section key={group.key} className={styles.group} aria-labelledby={`roadmap-group-${group.key}`}>
          <h3 id={`roadmap-group-${group.key}`} className={styles.heading}>
            {group.label}
            {group.showCount && <CountPill>{group.items.length}</CountPill>}
          </h3>
          <ul className={styles.list}>
            {group.items.map((m) => (
              <MilestoneRow key={m.id} milestone={m} referenceYear={referenceYear} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

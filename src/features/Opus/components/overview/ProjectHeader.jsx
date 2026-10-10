import React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import Progress from "@/components/arc/progress/progress";
import { humanDate } from "../../kit";
import styles from "./ProjectHeader.module.css";

// Passing a year that never matches keeps the year on every date: "27 Nov 2026".
const NEVER_YEAR = -1;
const fullDate = (iso) => humanDate(iso, NEVER_YEAR);

const targetText = (days) => {
  if (days == null) return { text: "No target date", isLate: false };
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} past target`, isLate: true };
  if (days === 0) return { text: "Target is today", isLate: false };
  return { text: `${days} ${days === 1 ? "day" : "days"} to target`, isLate: false };
};

/** The full block under the compact header: focus, dates, overall progress and Edit project. */
export default function ProjectHeader({ project, overview, onEdit }) {
  const target = targetText(overview.daysToTarget);
  const { done, total } = overview;
  return (
    <section className={styles.root} aria-label="Project summary">
      <div className={styles.top}>
        <div className={styles.text}>
          {project.focus ? <p className={styles.focus}>{project.focus}</p> : null}
          <p className={styles.meta}>
            <span className={target.isLate ? styles.late : undefined}>{target.text}</span>
            {project.targetDate ? <span>Target {fullDate(project.targetDate)}</span> : null}
            {project.nextMeeting ? <span>Next meeting {fullDate(project.nextMeeting)}</span> : null}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
          Edit project
        </Button>
      </div>
      <Progress
        className={styles.bar}
        value={done}
        max={total || 1}
        label={`${done} of ${total} ${total === 1 ? "task" : "tasks"} done`}
        showValue
      />
    </section>
  );
}

import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Select } from "@/components/composed/Select";
import { Button } from "@/components/arc/button/button";
import styles from "./ProjectDetails.module.css";

const PHASES = ["Discovery", "Planning", "Building", "Launching", "Maintaining"];

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Date-only strings parse as UTC midnight, which can land on the wrong local
// day, so the field gets local midnight instead.
const toFieldValue = (stored) => (!stored ? "" : DAY_ONLY.test(stored) ? `${stored}T00:00` : stored);
const toDay = (value) => (value ? value.slice(0, 10) : null);

/** Start, target, phase and next meeting. Every change saves at once, like the brief. */
export default function ProjectDetails({ project, updateProject }) {
  const save = (patch) => updateProject(project.id, patch);
  const phaseOptions = [
    ...PHASES,
    ...(project.phase && !PHASES.includes(project.phase) ? [project.phase] : []),
  ].map((p) => ({ value: p, label: p }));
  const targetBeforeStart =
    project.startDate && project.targetDate && project.targetDate.slice(0, 10) < project.startDate.slice(0, 10);

  return (
    <SectionCard titleAs="h2" title="Project details" bodyClassName={styles.body}>
      <div className={styles.grid}>
        <DateTimeField
          dateOnly
          label="Start date"
          value={toFieldValue(project.startDate)}
          onChange={(v) => save({ startDate: toDay(v) })}
        />
        <DateTimeField
          dateOnly
          label="Target date"
          value={toFieldValue(project.targetDate)}
          onChange={(v) => save({ targetDate: toDay(v) })}
        />
        <Select
          label="Phase"
          value={project.phase}
          options={phaseOptions}
          clearLabel="No phase"
          placeholder="Choose a phase"
          onChange={(v) => save({ phase: v })}
        />
        <div className={styles.meeting}>
          <DateTimeField
            label="Next meeting"
            value={toFieldValue(project.nextMeeting)}
            onChange={(v) => save({ nextMeeting: v || null })}
          />
          {project.nextMeeting && (
            <Button variant="ghost" size="sm" onClick={() => save({ nextMeeting: null })}>Clear meeting</Button>
          )}
        </div>
      </div>
      {targetBeforeStart && (
        <p className={styles.warning} role="status">The target date is before the start date.</p>
      )}
    </SectionCard>
  );
}

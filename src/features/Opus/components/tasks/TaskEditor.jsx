import React, { useState } from "react";
import { Input } from "@/components/arc/input/input";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { SCHEDULES } from "@/lib/constants";
import {
  PRIORITY_OPTIONS_SHORT, STATUS_OPTIONS, estimateOptionsFor, workstreamColor,
} from "./taskDisplay";
import styles from "./TaskEditor.module.css";

/** Body of the inline-edit popover. Every field writes straight through onUpdate. */
export default function TaskEditor({ task, workstreams, milestones, onUpdate, onDone }) {
  const [draftTitle, setDraftTitle] = useState(task.title);

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) onUpdate(task.id, { title: trimmed });
  };

  const wsOptions = workstreams.map((w) => ({ value: w.id, label: w.name, color: workstreamColor(w) }));
  const msOptions = milestones.map((m) => ({ value: m.id, label: m.title }));

  return (
    <div className={styles.editor}>
      <Input
        label="Title"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commitTitle(); onDone(); }
        }}
      />
      <div className={styles.grid}>
        <Select label="Status" value={task.status} options={STATUS_OPTIONS} onChange={(v) => onUpdate(task.id, { status: v })} />
        <Select label="Priority" value={task.priority || "p3"} options={PRIORITY_OPTIONS_SHORT} onChange={(v) => onUpdate(task.id, { priority: v })} />
        <Select label="Schedule" value={task.schedule || "today"} options={SCHEDULES} onChange={(v) => onUpdate(task.id, { schedule: v })} />
        <Select
          label="Estimate"
          value={task.estimate}
          options={estimateOptionsFor(task.estimate)}
          clearLabel="No estimate"
          placeholder="No estimate"
          onChange={(v) => onUpdate(task.id, { estimate: v })}
        />
        {wsOptions.length > 0 && (
          <Select
            label="Workstream"
            value={task.workstreamId}
            options={wsOptions}
            clearLabel="No workstream"
            placeholder="No workstream"
            onChange={(v) => onUpdate(task.id, { workstreamId: v })}
          />
        )}
        {msOptions.length > 0 && (
          <Select
            label="Milestone"
            value={task.milestoneId}
            options={msOptions}
            clearLabel="No milestone"
            placeholder="No milestone"
            onChange={(v) => onUpdate(task.id, { milestoneId: v })}
          />
        )}
      </div>
      <DateTimeField dateOnly label="Due" value={task.due || ""} onChange={(v) => onUpdate(task.id, { due: v || null })} />
    </div>
  );
}

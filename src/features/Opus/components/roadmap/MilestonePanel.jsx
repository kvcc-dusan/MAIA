import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { SidePanel } from "@/components/composed/SidePanel";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { STATUS_OPTIONS, seriesColor, statsText } from "./roadmapModel";
import styles from "./panels.module.css";

const FORM_ID = "roadmap-milestone-form";
// DateTimeField reads a local datetime; a bare date would parse as UTC and can land a day early.
const toField = (day) => (day ? `${day.slice(0, 10)}T00:00` : "");
const fromField = (value) => (value ? value.slice(0, 10) : "");

/**
 * Add or edit one milestone in a side panel. The parent mounts a fresh
 * instance (new `key`) per open, so the form always starts from `milestone`.
 */
export default function MilestonePanel({ open, milestone, workstreams, onClose, onSave, onDelete, onCloseAutoFocus }) {
  const isEditing = Boolean(milestone?.id);
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [workstreamId, setWorkstreamId] = useState(milestone?.workstreamId ?? null);
  const [start, setStart] = useState(fromField(milestone?.start));
  const [due, setDue] = useState(fromField(milestone?.date));
  const [status, setStatus] = useState(milestone?.status ?? "planned");
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!title.trim()) next.title = "Add a title for this milestone.";
    if (start && due && due < start) next.due = "The due date can't be before the start date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({
      title: title.trim(),
      workstreamId,
      start: start || null,
      date: due || null,
      status,
    });
  };

  const workstreamOptions = workstreams.map((w) => ({ value: w.id, label: w.name, color: seriesColor(w.color) }));

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={isEditing ? "Edit milestone" : "Add milestone"}
      description={isEditing ? milestone.title : "Give it a due date to place it on the timeline."}
      footer={
        <>
          {isEditing && (
            <Button type="button" variant="danger" onClick={() => onDelete(milestone.id)}>Delete milestone</Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID}>{isEditing ? "Save milestone" : "Add milestone"}</Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input label="Title" value={title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
        <Select
          label="Workstream"
          value={workstreamId}
          options={workstreamOptions}
          onChange={setWorkstreamId}
          placeholder="Unassigned"
          clearLabel="Unassigned"
        />
        <Select label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Dates</legend>
          <DateTimeField dateOnly label="Start date" value={toField(start)} onChange={(v) => setStart(fromField(v))} />
          <DateTimeField dateOnly label="Due date" value={toField(due)} onChange={(v) => setDue(fromField(v))} />
          {errors.due && <p role="alert" className={styles.error}>{errors.due}</p>}
          <p className={styles.hint}>Both are optional. Without a start date the milestone shows as a marker on its due date.</p>
        </fieldset>
        {isEditing && <p className={styles.info}>{statsText(milestone.stats)}</p>}
      </form>
    </SidePanel>
  );
}

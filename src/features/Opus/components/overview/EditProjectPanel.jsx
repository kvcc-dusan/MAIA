import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { SidePanel } from "@/components/composed/SidePanel";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { PROJECT_PHASES } from "../../lib/projectModel";
import styles from "./Panels.module.css";

const FORM_ID = "overview-edit-project";
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// A date-only string parses as UTC midnight, which can land on the wrong local day.
// Project files are hand-editable YAML, so a field can arrive as a number or a Date. Anything that is not a plain string becomes text (or empty) instead of throwing while the panel mounts.
const asText = (value) => (value == null ? "" : value instanceof Date ? (Number.isNaN(value.getTime()) ? "" : value.toISOString()) : String(value));
const toFieldValue = (stored) => {
  const text = asText(stored);
  return DAY_ONLY.test(text) ? `${text}T00:00` : text;
};
const toDay = (value) => (value ? value.slice(0, 10) : null);

/** Name, phase, headline, focus and the three dates. Mounted fresh per open, saves on submit. */
export default function EditProjectPanel({ open, project, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: asText(project.name),
    phase: project.phase == null ? null : asText(project.phase),
    headline: asText(project.headline),
    focus: asText(project.focus),
    startDate: toFieldValue(project.startDate),
    targetDate: toFieldValue(project.targetDate),
    nextMeeting: toFieldValue(project.nextMeeting),
  }));
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const onText = (key) => (event) => set(key)(event.target.value);

  const phases = [...PROJECT_PHASES, ...(form.phase && !PROJECT_PHASES.includes(form.phase) ? [form.phase] : [])]
    .map((p) => ({ value: p, label: p }));
  const targetBeforeStart = form.startDate && form.targetDate && toDay(form.targetDate) < toDay(form.startDate);

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Add a name for this project.");
      return;
    }
    onSave({
      name: form.name.trim(),
      phase: form.phase,
      headline: form.headline.trim(),
      focus: form.focus.trim(),
      startDate: toDay(form.startDate),
      targetDate: toDay(form.targetDate),
      nextMeeting: form.nextMeeting || null,
    });
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Edit project"
      description="The name, phase and dates shown at the top of the project."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID}>Save project</Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={submit} noValidate>
        <Input label="Name" value={form.name} error={error} onChange={onText("name")} />
        <Select label="Phase" value={form.phase} options={phases} clearLabel="No phase" placeholder="Choose a phase" onChange={set("phase")} />
        <Input label="Headline" value={form.headline} onChange={onText("headline")} />
        <Textarea label="Focus" value={form.focus} onChange={onText("focus")} />
        <DateTimeField dateOnly label="Start date" value={form.startDate} onChange={set("startDate")} />
        <DateTimeField dateOnly label="Target date" value={form.targetDate} onChange={set("targetDate")} />
        {targetBeforeStart ? <p className={styles.warning} role="status">The target date is before the start date.</p> : null}
        <div className={styles.meeting}>
          <DateTimeField label="Next meeting" value={form.nextMeeting} onChange={set("nextMeeting")} />
          {form.nextMeeting ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => set("nextMeeting")("")}>Clear meeting</Button>
          ) : null}
        </div>
      </form>
    </SidePanel>
  );
}

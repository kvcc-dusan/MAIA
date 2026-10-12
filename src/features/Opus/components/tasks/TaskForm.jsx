import React, { useId } from "react";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Select } from "@/components/composed/Select";
import { FormGrid, FormSpan } from "@/components/composed/FormGrid";
import { PRIORITY_OPTIONS_SHORT, STATUS_OPTIONS, estimateOptionsFor, workstreamColor } from "./taskDisplay";
import styles from "./TaskEditor.module.css";

/** Fields of the task form shared by the Board and the Tasks tab. Controlled: the panel owns the draft. */
export default function TaskForm({ formId, draft, errors, saveError, project, people = [], onChange, onSubmit }) {
  const listId = useId();
  const patch = (changes) => onChange({ ...draft, ...changes });
  const workstreamOptions = [...(project.workstreams ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((w) => ({ value: w.id, label: w.name, color: workstreamColor(w) }));
  const milestoneOptions = [...(project.milestones ?? [])]
    .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
    .map((m) => ({ value: m.id, label: m.title }));

  return (
    <FormGrid as="form" id={formId} onSubmit={onSubmit} noValidate>
      <FormSpan>
        <Input label="Title" value={draft.title} onChange={(e) => patch({ title: e.target.value })} error={errors.title} autoFocus />
      </FormSpan>
      <FormSpan>
        <Textarea label="Description" value={draft.desc} onChange={(e) => patch({ desc: e.target.value })} rows={4} />
      </FormSpan>
      <Select label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={(status) => patch({ status })} />
      <Select label="Priority" value={draft.priority} options={PRIORITY_OPTIONS_SHORT} onChange={(priority) => patch({ priority: priority ?? "p3" })} />
      <Select
        label="Workstream"
        value={draft.workstreamId}
        options={workstreamOptions}
        clearLabel="None"
        placeholder="None"
        onChange={(workstreamId) => patch({ workstreamId })}
      />
      <Select
        label="Milestone"
        value={draft.milestoneId}
        options={milestoneOptions}
        clearLabel="None"
        placeholder="None"
        onChange={(milestoneId) => patch({ milestoneId })}
      />
      <Input label="Owner" value={draft.owner} onChange={(e) => patch({ owner: e.target.value })} list={listId} autoComplete="off" />
      <datalist id={listId}>
        {people.map((name) => <option key={name} value={name} />)}
      </datalist>
      <DateTimeField
        dateOnly
        label="Due date"
        value={draft.due ? `${draft.due}T12:00` : ""}
        onChange={(value) => patch({ due: String(value ?? "").slice(0, 10) })}
      />
      <Select
        label="Estimate"
        value={draft.estimate}
        options={estimateOptionsFor(draft.estimate)}
        clearLabel="No estimate"
        placeholder="No estimate"
        onChange={(estimate) => patch({ estimate })}
      />
      {saveError && <FormSpan><p role="alert" className={styles.error}>{saveError}</p></FormSpan>}
    </FormGrid>
  );
}
